import { describe, it, expect } from "vitest";
import { isDeliveryReady, SAGA_STEPS, INSTANCE_STATUSES } from "./instanceEngine";
import { checksumSource } from "./secrets";

describe("delivery gate", () => {
  it("rejects incomplete delivery", () => {
    expect(isDeliveryReady({ paymentVerified: true, instanceUrl: "https://x.com", sourceReady: true, licenseReady: true, healthOk: false })).toBe(false);
    expect(isDeliveryReady({ paymentVerified: false, instanceUrl: "https://x.com", sourceReady: true, licenseReady: true, healthOk: true })).toBe(false);
    expect(isDeliveryReady({ paymentVerified: true, instanceUrl: undefined, sourceReady: true, licenseReady: true, healthOk: true })).toBe(false);
  });

  it("accepts complete delivery evidence", () => {
    expect(
      isDeliveryReady({
        paymentVerified: true,
        instanceUrl: "https://customer.example.com",
        sourceReady: true,
        licenseReady: true,
        healthOk: true,
      }),
    ).toBe(true);
  });

  it("defines full saga and status enums", () => {
    expect(SAGA_STEPS).toContain("DELIVERY_READY");
    expect(SAGA_STEPS).toContain("NOT_CONFIGURED");
    expect(INSTANCE_STATUSES).toContain("ready");
    expect(INSTANCE_STATUSES).toContain("failed");
  });
});

describe("source version isolation checksum", () => {
  it("locks content identity for product version", () => {
    const v1 = checksumSource("export const VERSION='1.0.0'");
    const v2 = checksumSource("export const VERSION='2.0.0'");
    expect(v1).not.toBe(v2);
    // Customer stays on v1 checksum even if master changes
    const customerLocked = v1;
    expect(customerLocked).toBe(checksumSource("export const VERSION='1.0.0'"));
  });
});
