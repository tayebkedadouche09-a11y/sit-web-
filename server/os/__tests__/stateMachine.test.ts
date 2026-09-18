import { describe, expect, it } from "vitest";
import { assertDeploymentTransition, canTransitionDeployment } from "../stateMachine";

describe("deployment state machine", () => {
  it("accepts the happy path", () => {
    expect(canTransitionDeployment("queued", "running")).toBe(true);
    expect(canTransitionDeployment("running", "health_check")).toBe(true);
    expect(canTransitionDeployment("health_check", "succeeded")).toBe(true);
  });

  it("rejects unsafe jumps", () => {
    expect(canTransitionDeployment("queued", "succeeded")).toBe(false);
    expect(() => assertDeploymentTransition("queued", "succeeded")).toThrow();
  });
});
