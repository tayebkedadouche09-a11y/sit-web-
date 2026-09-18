/**
 * NUMI Customer Instance Engine — isolation contract
 *
 * MASTER PRODUCT  ≠  PRODUCT VERSION  ≠  CUSTOMER INSTANCE
 *
 * After payment verification the platform creates an isolated instance that
 * never depends on later edits to the master catalog product.
 *
 * Saga steps (tracked on customer_instances.sagaStep):
 *   INSTANCE_CREATED → SOURCE_PROVISIONING → DATABASE → SECRETS →
 *   VERCEL → HEALTH → DELIVERY_READY
 *
 * READY only when: instanceUrl + sourceReady + license + healthOk
 * NOT_CONFIGURED when GitHub/Vercel/DB providers missing — never fake success.
 */
export const SAGA_STEPS = [
  "INSTANCE_CREATED",
  "VERSION_LOCKED",
  "SOURCE_PROVISIONING",
  "SOURCE_VERIFIED",
  "DATABASE",
  "SECRETS",
  "ENV_CONFIGURED",
  "VERCEL",
  "DEPLOYING",
  "HEALTH",
  "ADMIN",
  "DOCUMENTATION",
  "LICENSE",
  "DELIVERY_READY",
  "NOT_CONFIGURED",
  "FAILED",
] as const;

export type SagaStep = (typeof SAGA_STEPS)[number];

export const INSTANCE_STATUSES = [
  "creating",
  "provisioning",
  "deploying",
  "health_checking",
  "ready",
  "degraded",
  "failed",
  "rolling_back",
  "suspended",
  "archived",
] as const;

export type InstanceStatus = (typeof INSTANCE_STATUSES)[number];

/** Delivery gate — all must be true for customer access */
export function isDeliveryReady(input: {
  paymentVerified: boolean;
  instanceUrl?: string | null;
  sourceReady?: boolean;
  licenseReady?: boolean;
  healthOk?: boolean;
}): boolean {
  return Boolean(
    input.paymentVerified &&
      input.instanceUrl &&
      input.sourceReady &&
      input.licenseReady &&
      input.healthOk,
  );
}
