import crypto from "node:crypto";
import { ENV } from "./_core/env";
import { markOrderPaid, markOrderPaymentFailed } from "./db";

type CheckoutInput = { orderId: number; name: string; amount: string; currency: string; customerEmail?: string | null };

function assertStripeConfig() {
  if (!ENV.stripeSecretKey || !ENV.stripeWebhookSecret || !ENV.appOrigin) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and PUBLIC_APP_URL.");
  }
}

async function stripeRequest(path: string, body: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${ENV.stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const json = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message ?? "Stripe request failed");
  return json;
}

export async function createStripeCheckoutSession(input: CheckoutInput) {
  assertStripeConfig();
  const amount = Math.round(Number(input.amount) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid order amount");
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${ENV.appOrigin.replace(/\/$/, "")}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${ENV.appOrigin.replace(/\/$/, "")}/account?checkout=cancelled`);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(amount));
  body.set("line_items[0][price_data][product_data][name]", input.name);
  body.set("metadata[order_id]", String(input.orderId));
  body.set("payment_intent_data[metadata][order_id]", String(input.orderId));
  if (input.customerEmail) body.set("customer_email", input.customerEmail);
  const session = await stripeRequest("checkout/sessions", body);
  if (!session.id || !session.url) throw new Error("Stripe returned an incomplete checkout session");
  return { sessionId: session.id, url: session.url };
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string) {
  if (!ENV.stripeWebhookSecret) throw new Error("Stripe webhook secret is not configured");
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=", 2) as [string, string]));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Invalid Stripe webhook timestamp");
  const expected = crypto.createHmac("sha256", ENV.stripeWebhookSecret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid Stripe webhook signature");
}

export async function handleStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
  assertStripeConfig();
  if (!signatureHeader) throw new Error("Missing Stripe signature");
  verifyStripeSignature(rawBody, signatureHeader);
  const event = JSON.parse(rawBody.toString("utf8")) as { id?: string; type?: string; data?: { object?: Record<string, any> } };
  const object = event.data?.object ?? {};
  const orderId = Number(object.metadata?.order_id ?? object.payment_intent_metadata?.order_id);
  if (!Number.isInteger(orderId) || orderId <= 0) return { received: true, ignored: true };
  if (event.type === "checkout.session.completed" && object.payment_status === "paid") await markOrderPaid(orderId, String(object.payment_intent ?? object.id), event.id, "stripe", Number(object.amount_total ?? object.amount_received ?? 0), String(object.currency ?? ""));
  if (event.type === "payment_intent.payment_failed") await markOrderPaymentFailed(orderId, String(object.id), event.id, "stripe");
  return { received: true, eventType: event.type };
}
