import { ENV } from "./_core/env";

function configured() { return Boolean(ENV.chargilySecretKey && ENV.appOrigin); }

async function chargilyRequest<T>(path: string, init: RequestInit = {}) {
  if (!ENV.chargilySecretKey) throw new Error("Chargily Pay is not configured.");
  const response = await fetch(`${ENV.chargilyApiUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${ENV.chargilySecretKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const payload = await response.json() as T & { message?: string; error?: string };
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? `Chargily Pay request failed (${response.status})`);
  return payload as T;
}

export function isChargilyConfigured() { return configured(); }

export async function createChargilyCheckoutSession(input: { orderId: number; name: string; amount: string; currency: string }) {
  if (!configured()) throw new Error("Chargily Pay is not configured. Set CHARGILY_SECRET_KEY and PUBLIC_APP_URL.");
  if (input.currency.toLowerCase() !== "dzd") throw new Error("Chargily Pay checkout requires DZD pricing.");
  const amount = Math.round(Number(input.amount));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid DZD order amount");
  const payload = await chargilyRequest<{ id: string; checkout_url: string }>("/checkouts", {
    method: "POST",
    body: JSON.stringify({ amount, currency: "dzd", payment_method: "edahabia", success_url: `${ENV.appOrigin.replace(/\/$/, "")}/account?checkout=success`, failure_url: `${ENV.appOrigin.replace(/\/$/, "")}/account?checkout=cancelled`, webhook_endpoint: `${ENV.appOrigin.replace(/\/$/, "")}/api/chargily/webhook`, description: `NUMI — ${input.name}`, locale: "ar", metadata: { order_id: String(input.orderId) } }),
  });
  if (!payload.id || !payload.checkout_url) throw new Error("Chargily Pay returned an incomplete checkout");
  return { sessionId: payload.id, url: payload.checkout_url };
}

export async function verifyChargilyCheckout(checkoutId: string) {
  return chargilyRequest<{ id: string; status: string; amount: number; currency: string; metadata?: Record<string, string> }>(`/checkouts/${encodeURIComponent(checkoutId)}`, { method: "GET" });
}
