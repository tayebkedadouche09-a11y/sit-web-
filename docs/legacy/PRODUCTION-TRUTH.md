> **HISTORICAL / LEGACY DOCUMENT** — Applies to older NUMI 4.x audits.
> **Current release:** NUMI **v5.0.1-HARDENED**.
> **Authoritative readiness report:** `docs/PRODUCTION-READINESS-v5.0.1-FINAL.md` (and `PRODUCTION-READINESS-v5.0.1.md`).
> Do **not** treat this file as the live production gate for v5.0.1.

# PRODUCTION-TRUTH.md

| Name | Implementation | Environment | Test | Result | Status |
|------|----------------|-------------|------|--------|--------|
| Database marketplace | REAL | DATABASE_URL | migrate/seed | NOT VERIFIED without DB | NOT_CONFIGURED until .env |
| Stripe | REAL code | STRIPE_* | unit amount rules PASS | live NOT VERIFIED | NOT_CONFIGURED without keys |
| PayPal | REAL code | PAYPAL_* | unit rules PASS | live NOT VERIFIED | NOT_CONFIGURED without keys |
| Chargily | REAL code | CHARGILY_* | unit rules PASS | live NOT VERIFIED | NOT_CONFIGURED without keys |
| GitHub | REAL code | GITHUB_* | — | NOT VERIFIED | NOT_CONFIGURED without keys |
| Vercel | REAL code | VERCEL_* | — | NOT VERIFIED | NOT_CONFIGURED without keys |
| Customer DB | REAL abstraction | CUSTOMER_DB_* | — | NOT VERIFIED | NOT_CONFIGURED without keys |
| Secrets encryption | REAL AES-GCM | SECRETS_ENCRYPTION_KEY | unit PASS | fail-safe without key | REAL when key set |
| Delivery READY gate | REAL | — | unit PASS | no fake READY | REAL |
| Backup | incomplete | — | — | — | NOT_CONFIGURED / incomplete |
| Domain SSL verify | incomplete | — | — | — | incomplete |
