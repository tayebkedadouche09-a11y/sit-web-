> **HISTORICAL / LEGACY DOCUMENT** — Applies to older NUMI 4.x audits.
> **Current release:** NUMI **v5.0.1-HARDENED**.
> **Authoritative readiness report:** `docs/PRODUCTION-READINESS-v5.0.1-FINAL.md` (and `PRODUCTION-READINESS-v5.0.1.md`).
> Do **not** treat this file as the live production gate for v5.0.1.

# FINAL-VERIFICATION-MATRIX.md

| Feature | Implementation | Test | Expected | Actual | Status |
|---------|----------------|------|----------|--------|--------|
| Delivery gate | instanceEngine.ts | node unit | reject incomplete | reject incomplete | PASS |
| Payment amount match | markOrderPaid rules | node unit | reject mismatch | reject mismatch | PASS |
| Payment currency match | markOrderPaid rules | node unit | reject mismatch | reject mismatch | PASS |
| Idempotent event set | conceptual | node unit | second call idempotent | ok | PASS |
| Source checksum lock | secrets.checksumSource | node unit | v1≠v2 | ok | PASS |
| AES secret roundtrip | crypto | node unit | decrypt=plain | ok | PASS |
| Secrets no plain persist | secrets.encryptSecret | code review | NOT_CONFIGURED without key | NOT_CONFIGURED | PASS |
| Stripe live checkout | stripe.ts | live | session URL | NOT VERIFIED | NOT VERIFIED |
| PayPal live | paypal.ts | live | capture | NOT VERIFIED | NOT VERIFIED |
| Chargily live | chargily.ts | live | checkout | NOT VERIFIED | NOT VERIFIED |
| GitHub repo create | github.ts | live API | private repo | NOT VERIFIED | NOT VERIFIED |
| Vercel deploy | vercel.ts | live API | deployment URL | NOT VERIFIED | NOT VERIFIED |
| Customer DB Neon | databaseProvider.ts | live API | connection URL | NOT VERIFIED | NOT VERIFIED |
| Customer Admin login | — | E2E | session | NOT VERIFIED | NOT VERIFIED |
| Full E2E purchase | — | E2E | READY delivery | NOT VERIFIED | NOT VERIFIED |
| Backup/restore | — | — | restore ok | missing full impl | FAIL |
| Rollback deploy | stateMachine | unit only | transition rules | partial | NOT VERIFIED |
| Clean install + build | package | sandbox | build exit 0 | install incomplete | NOT VERIFIED |
