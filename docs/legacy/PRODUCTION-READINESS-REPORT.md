> **HISTORICAL / LEGACY DOCUMENT** — Applies to older NUMI 4.x audits.
> **Current release:** NUMI **v5.0.1-HARDENED**.
> **Authoritative readiness report:** `docs/PRODUCTION-READINESS-v5.0.1-FINAL.md` (and `PRODUCTION-READINESS-v5.0.1.md`).
> Do **not** treat this file as the live production gate for v5.0.1.

# NUMI v5.0.0 — PRODUCTION READINESS REPORT

Generated as part of Production Completion & Final Hardening.

Legend: **PASS** | **PARTIAL** | **FAIL** | **NOT VERIFIED** (requires live credentials)

---

## Infrastructure

| Area | Status | Notes |
|------|--------|-------|
| Database (PostgreSQL/Supabase) | PARTIAL | Schema + driver converted; live connectivity NOT VERIFIED |
| Storage backups | PARTIAL | Application backup to S3/webhook implemented; needs keys |
| Secrets in repo | PASS | No hardcoded live keys found in source sweep |
| `.env.example` | PASS | v5 names only, no secrets |

## Payments

| Area | Status | Notes |
|------|--------|-------|
| Server-side verification | PASS | markOrderPaid requires provider verification path |
| Webhook idempotency | PASS | Paid status + purchase existence short-circuit |
| Client cannot force PAID | PASS | Frontend only starts checkout |
| Refund flow | PARTIAL | `applyVerifiedRefund` implemented; provider webhook wiring per-provider must be connected in live |
| Live payment E2E | NOT VERIFIED | Needs Chargily/Stripe test keys |

## Provisioning

| Area | Status | Notes |
|------|--------|-------|
| Customer DB (Neon) | PARTIAL | Live create path for Neon; other providers NOT_CONFIGURED honestly |
| GitHub repo copy | PARTIAL | Code complete; live API NOT VERIFIED |
| Vercel deploy | PARTIAL | Code complete; live API NOT VERIFIED |
| Health check before READY | PASS | HTTP health required for ready path |
| Rollback | PARTIAL | Snapshot + admin rollback of instance metadata/URL; CDN/Vercel promote still ops-dependent |
| Delivery gate | PASS | accessGranted only after successful provision path |

## Security

| Area | Status | Notes |
|------|--------|-------|
| RBAC admin vs customer | PASS | adminProcedure / protectedProcedure |
| Customer isolation (API) | PASS | purchases scoped by userId |
| RLS policies on Supabase | NOT VERIFIED | App uses server connection; enable RLS if using anon key (not default path) |
| Secret redaction helper | PASS | `server/security/redact.ts` |
| Delivery URL guessing | PASS | downloads require accessGranted + ownership |

## Reliability

| Area | Status | Notes |
|------|--------|-------|
| Automation job retry | PASS | attempts + runAfter + worker |
| Backup create | PARTIAL | Implemented; NOT VERIFIED live |
| Restore | PARTIAL | Validate + safety backup + gated confirm; full table import via ops/Supabase PITR |
| Worker failure → READY | PASS | READY only after success path |

## Quality

| Area | Status | Notes |
|------|--------|-------|
| Build | NOT VERIFIED | Run `pnpm build` on your machine |
| Typecheck | NOT VERIFIED | Run `pnpm check` |
| Unit tests | NOT VERIFIED | Run `pnpm test` |
| E2E full lifecycle | NOT VERIFIED | Requires live providers |
| Clean install | NOT VERIFIED | Follow LOCAL-VSCODE + DEPLOY-FULL |

## Documentation

| Area | Status |
|------|--------|
| Version 5.0.0 | PASS |
| MySQL primary docs removed/updated | PASS |
| Deploy + local guides | PASS |

---

## Definition of Done (honest)

NUMI **cannot** be marked fully Production-Ready until live checks pass on **your** accounts:

1. `pnpm check` + `pnpm build`
2. Supabase push + seed
3. Chargily test payment → PAID → instance URL
4. Backup create with S3 or webhook
5. Refund webhook → access revoked
6. Admin rollback on a test instance

Code hardening delivered in this pass closes architectural gaps (backup module, refund, rollback, health tiers, secret redaction, admin ops, doc cleanup). Live verification remains on the operator.

---

## Files touched (hardening pass)

See release notes in `RELEASE_NOTES.md` / commit summary accompanying the zip.
