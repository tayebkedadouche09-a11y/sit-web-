# NUMI V2 — MASTER SPEC
## Automation & Digital Business OS

### Product mission
NUMI evolves from a website marketplace into a private operating system for a digital website business:

`Create → Import → Preview → Test → Publish → Sell → Provision → Deploy → Deliver → Monitor → Update → Support`

The V2 layer must sit on top of the V1 foundation and preserve existing customers, orders, licenses, deliveries, reviews and catalog data.

## 1. Architecture boundaries
Three entities must never be conflated:

- **Master Template** — the owner's source/template.
- **Product Version** — a frozen release of a product.
- **Customer Instance** — an independent copy owned/controlled by the buyer.

A customer's instance must not depend on the owner's personal GitHub/Vercel/Supabase/domain account for normal operation when full ownership is sold.

## 2. GitHub integration
- Least-privilege access.
- Private repositories remain private.
- Import by repository/branch/commit.
- Record source repository, commit SHA and import timestamp.
- Never store provider tokens in source code.

## 3. Product import
Import source from GitHub or an approved archive into a quarantined workspace.
Record:
- source type
- source URL/repository
- commit/archive checksum
- detected framework
- build command
- output directory
- environment variables required
- import status and logs

## 4. Staging and automated audit
Lifecycle:
`Draft → Staging → Testing → Approval → Production`

Audit checks should include:
- build/runtime errors
- broken links and 404s
- missing images
- metadata/SEO basics
- forms and basic auth flows
- database connectivity
- environment configuration
- mobile rendering
- accessibility indicators
- performance indicators

Production publication requires an explicit owner-approved action.

## 5. Deployment and rollback
Every deployment receives an immutable deployment ID and records:
- product/version
- environment
- source commit
- started/completed time
- status
- logs reference
- health result

Keep a rollback target for the last known-good deployment.

## 6. Product versioning
Support semantic releases such as `v1.0`, `v1.1`, `v2.0` with:
- changelog
- release date
- source commit
- compatibility notes
- deployment status

## 7. Domain Center
Domain ownership is separate from application ownership. A customer's domain must remain independent from the owner's personal domain. Track verification, DNS state, SSL state and target instance.

## 8. Monitoring
Monitor customer instances and public demos for uptime, HTTP status, latency, SSL/domain health and deployment health. Alert on meaningful failures; do not expose secrets in logs.

## 9. Analytics
Track the funnel:
`Views → Demo → Checkout → Purchase → Delivery → Activation`

Analytics should be privacy-conscious and aggregated where possible.

## 10. Backup and disaster recovery
Back up critical metadata and customer delivery artifacts. Record backup timestamps, checksums, retention and restore verification. A backup is only considered healthy after restore validation.

## 11. Support and notifications
Support tickets attach to customer/site/order context. Notify for payment success, website ready, delivery completion, deployment failure, domain problems, support replies and backup failures.

## 12. AI Workspace
AI can inspect, explain, propose and prepare changes. Sensitive operations require owner approval:
- delete
- publish
- production deployment
- database schema changes
- secret changes
- ownership transfer

AI is an operator, never the owner.

## 13. Cost tracking
Track estimated infrastructure cost per product/customer instance and compare against revenue to expose approximate gross margin.

## 14. License and refunds
Every delivered product gets a license record. Refund processing must revoke or suspend access according to the license policy and record the reason/audit event.

## 15. Fraud and abuse
Rate-limit sensitive actions, detect repeated payment/download abuse, and keep an audit trail. Do not block legitimate users solely on heuristic signals; provide owner review.

## 16. Feature flags
Roll out risky capabilities gradually by environment, product, customer or percentage cohort. Flags must fail closed for destructive features.

## 17. Advanced automation
Build idempotent jobs with retries, timeouts, dead-letter/error states and correlation IDs. Every automation must be observable.

## 18. Completion definition
V2 is complete only when each feature is implemented, integrated with permissions, tested, documented, observable where appropriate, and has a recovery/rollback strategy where destructive or production-affecting.
