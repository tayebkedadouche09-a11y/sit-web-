import crypto from "node:crypto";
import { ENV } from "./_core/env";

function configured() { return Boolean(ENV.paypalClientId && ENV.paypalClientSecret && ENV.appOrigin); }

async function accessToken() {
  if (!configured()) throw new Error("PayPal is not configured.");
  const auth = Buffer.from(`${ENV.paypalClientId}:${ENV.paypalClientSecret}`).toString("base64");
  const response = await fetch(`${ENV.paypalApiUrl.replace(/\/$/, "")}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const payload = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description ?? "PayPal authentication failed");
  return payload.access_token;
}

async function paypalRequest<T>(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(`${ENV.paypalApiUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": crypto.randomUUID(), ...(init.headers ?? {}) } });
  const payload = await response.json() as T & { message?: string; name?: string; details?: Array<{ description?: string }> };
  if (!response.ok) throw new Error(payload.details?.[0]?.description ?? payload.message ?? payload.name ?? `PayPal API failed (${response.status})`);
  return payload as T;
}

export function isPayPalConfigured() { return configured(); }

export async function createPayPalOrder(input: { orderId: number; name: string; amount: string; currency: string }) {
  if (!configured()) throw new Error("PayPal is not configured.");
  const payload = await paypalRequest<{ id: string; links?: Array<{ rel: string; href: string }> }>("/v2/checkout/orders", { method: "POST", body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ custom_id: String(input.orderId), description: input.name, amount: { currency_code: input.currency.toUpperCase(), value: Number(input.amount).toFixed(2) } }], payment_source: { paypal: { experience_context: { user_action: "PAY_NOW", return_url: `${ENV.appOrigin.replace(/\/$/, "")}/account?checkout=paypal&order_id=${encodeURIComponent(String(input.orderId))}`, cancel_url: `${ENV.appOrigin.replace(/\/$/, "")}/account?checkout=cancelled` } } } }) });
  const approve = payload.links?.find(link => link.rel === "payer-action" || link.rel === "approve")?.href;
  if (!payload.id || !approve) throw new Error("PayPal did not return an approval URL.");
  return { sessionId: payload.id, url: approve };
}

export async function capturePayPalOrder(orderId: number, paypalOrderId: string) {
  const details = await paypalRequest<{ id: string; status: string; purchase_units?: Array<{ custom_id?: string; amount?: { value?: string; currency_code?: string } }> }>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { method: "GET" });
  const unit = details.purchase_units?.[0];
  if (String(unit?.custom_id ?? "") !== String(orderId)) throw new Error("PayPal order does not belong to this NUMI order.");
  if (details.status === "COMPLETED") return { id: details.id, status: details.status, amount: Number(unit?.amount?.value ?? 0), currency: unit?.amount?.currency_code ?? "" };
  const captured = await paypalRequest<{ id: string; status: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id: string; status: string; amount?: { value?: string; currency_code?: string } }> } }> }>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { method: "POST", body: "{}" });
  const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
  if (captured.status !== "COMPLETED" || capture?.status !== "COMPLETED") throw new Error("PayPal payment was not captured.");
  return { id: capture.id, status: captured.status, amount: Number(capture.amount?.value ?? 0), currency: capture.amount?.currency_code ?? "" };
}
