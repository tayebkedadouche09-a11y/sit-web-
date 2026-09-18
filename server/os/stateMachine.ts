export type DeploymentState = "queued" | "running" | "health_check" | "succeeded" | "failed" | "rollback";

const transitions: Record<DeploymentState, readonly DeploymentState[]> = {
  queued: ["running"],
  running: ["health_check", "failed"],
  health_check: ["succeeded", "failed"],
  succeeded: [],
  failed: ["queued", "rollback"],
  rollback: ["queued", "failed"],
};

export function canTransitionDeployment(from: DeploymentState, to: DeploymentState) {
  return transitions[from].includes(to);
}

export function assertDeploymentTransition(from: DeploymentState, to: DeploymentState) {
  if (!canTransitionDeployment(from, to)) {
    throw new Error(`Invalid deployment transition: ${from} -> ${to}`);
  }
  return to;
}
