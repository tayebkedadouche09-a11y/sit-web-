> **HISTORICAL / LEGACY DOCUMENT** — Applies to older NUMI 4.x audits.
> **Current release:** NUMI **v5.0.1-HARDENED**.
> **Authoritative readiness report:** `docs/PRODUCTION-READINESS-v5.0.1-FINAL.md` (and `PRODUCTION-READINESS-v5.0.1.md`).
> Do **not** treat this file as the live production gate for v5.0.1.

# NUMI Production Checklist (3.4.0)

**Only `.env` is manual.**

## Before first start
1. `cp .env.example .env`
2. Set at minimum: `DATABASE_URL`, `PUBLIC_APP_URL`, `JWT_SECRET`, OAuth vars
3. `pnpm install`
4. `pnpm setup` (migrate + seed + preflight)
5. `pnpm build && pnpm start`

## Before accepting real payments
- [ ] At least one of Stripe / Chargily / PayPal fully set in `.env`
- [ ] Webhook endpoints pointed at `PUBLIC_APP_URL` (Stripe/Chargily/PayPal dashboards)
- [ ] `pnpm preflight` shows payments READY
- [ ] Test payment in provider test mode first

## Before automatic customer delivery
- [ ] `GITHUB_TOKEN` + `GITHUB_OWNER`
- [ ] `VERCEL_TOKEN` (+ optional `VERCEL_TEAM_ID`)
- [ ] Product has real `sourceRepoUrl` for the version being sold
- [ ] Optional: `CUSTOMER_DB_PROVIDER` + provider keys
- [ ] Optional: `SECRETS_ENCRYPTION_KEY` (64 hex chars)

## Status meanings
| Status | Meaning |
|--------|---------|
| READY / CONNECTED | Evidence present |
| NOT_CONFIGURED | Missing env — no crash, no fake success |
| ERROR | Configured but probe failed |

## Never
- Edit source to change providers
- Mark Order PAID from frontend alone
- Mark Delivery READY without health check evidence
