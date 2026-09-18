import { describe, it, expect } from "vitest";

/** Mirror amount/currency rules used in markOrderPaid */
function verifyPaymentAmount(orderSubtotal: string, verifiedAmountMinor: number, provider: string, currency: string, orderCurrency: string) {
  const expectedMinor = Math.round(Number(orderSubtotal) * 100);
  const receivedMinor = provider === "chargily" ? Math.round(verifiedAmountMinor * 100) : Math.round(verifiedAmountMinor);
  if (receivedMinor !== expectedMinor) throw new Error("Verified payment amount does not match the order total.");
  if (currency.toLowerCase() !== orderCurrency.toLowerCase()) throw new Error("Verified payment currency does not match the order.");
  return true;
}

describe("payment verification rules", () => {
  it("accepts matching stripe amount in minor units", () => {
    expect(verifyPaymentAmount("49.00", 4900, "stripe", "usd", "usd")).toBe(true);
  });
  it("rejects wrong amount", () => {
    expect(() => verifyPaymentAmount("49.00", 100, "stripe", "usd", "usd")).toThrow(/amount/);
  });
  it("rejects wrong currency", () => {
    expect(() => verifyPaymentAmount("49.00", 4900, "stripe", "eur", "usd")).toThrow(/currency/);
  });
  it("idempotent conceptual: same event twice is safe if already paid", () => {
    const processed = new Set<string>();
    const eventId = "evt_1";
    const run = () => {
      if (processed.has(eventId)) return { idempotent: true };
      processed.add(eventId);
      return { idempotent: false };
    };
    expect(run().idempotent).toBe(false);
    expect(run().idempotent).toBe(true);
  });
});
