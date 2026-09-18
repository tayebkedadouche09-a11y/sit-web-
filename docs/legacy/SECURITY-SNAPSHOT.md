> **HISTORICAL / LEGACY DOCUMENT** — Applies to older NUMI 4.x audits.
> **Current release:** NUMI **v5.0.1-HARDENED**.
> **Authoritative readiness report:** `docs/PRODUCTION-READINESS-v5.0.1-FINAL.md` (and `PRODUCTION-READINESS-v5.0.1.md`).
> Do **not** treat this file as the live production gate for v5.0.1.

# NUMI Security Snapshot

## Strengths
- Payment amount/currency verified server-side (not frontend-only PAID)
- Secrets: AES-GCM when SECRETS_ENCRYPTION_KEY set; no plain: persist
- Delivery READY requires payment + URL + source + license + health
- NOT_CONFIGURED instead of fake success for missing providers
- Ambient audio: Web Audio API only, no external media URLs, user-gesture unlock, volume capped
- Auth cookies httpOnly patterns in core stack
- Admin routes role-gated

## Residual risks (require operator discipline)
- OAuth / payment / GitHub / Vercel keys must stay in .env only (never commit)
- Webhook endpoints must use provider signatures
- Clean install + dependency audit recommended before public launch (`pnpm audit`)
- Rate limiting strength depends on deployment reverse-proxy
- Full E2E security suite not run in this sandbox without live keys

## Estimated posture (engineering judgment, not a formal audit score)
| Area | Assessment |
|------|------------|
| Secret handling design | Strong when key configured |
| Payment verification design | Strong rules; live depends on keys |
| XSS surface (ambient/UI) | Low (no remote audio URLs) |
| Access control | Present; needs live verification |
| Overall readiness for public paid traffic | **Not certified** until live pentest + webhook tests |

Do not treat this as a compliance certificate.
