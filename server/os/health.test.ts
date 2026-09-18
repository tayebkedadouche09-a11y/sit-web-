import { describe, it, expect } from "vitest";
import { checkHttpHealth } from "./health";

describe("checkHttpHealth", () => {
  it("returns not ok for invalid URL host", async () => {
    const r = await checkHttpHealth("http://127.0.0.1:1/", 500);
    expect(r.ok).toBe(false);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
