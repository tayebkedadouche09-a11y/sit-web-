# NUMI Control Plane

## Canonical state machine

### Order
`PENDING → PAYMENT_VERIFIED → PAID → PROVISIONING → DELIVERED`

Cancellation/refund paths are explicit and audited.

### Website instance
`CREATING → STAGING → TESTING → APPROVED → DEPLOYING → LIVE`

Failure paths:
`FAILED → RETRYING | ROLLBACK | BLOCKED`

### Deployment
`QUEUED → RUNNING → HEALTH_CHECK → SUCCEEDED`

or
`QUEUED → RUNNING → FAILED → ROLLBACK`

## Correlation
Every asynchronous operation should carry a correlation ID and reference the user, order, purchase, product, version and instance where applicable.

## Ownership
- Owner/admin: platform control.
- Customer: only licensed resources belonging to that customer.
- Automation worker: executes an approved operation.
- AI: proposes/prepares actions and may execute only within explicitly granted permissions.

## Isolation rule
Never use a shared owner credential as the customer's runtime dependency. Provider adapters must issue per-instance references/credentials where supported.
