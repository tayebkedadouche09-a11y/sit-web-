# PRODUCTION-READINESS-v5.0.1-FINAL.md

**Product:** NUMI v5.0.1-HARDENED  
**Scope:** Full project audit + cleanup (no new features)  
**Date:** 2026-09-18  

---

## Three-layer status (do not conflate)

| Layer | Status |
|-------|--------|
| **CODE VERIFIED** | PASS — single v5 architecture; install/check/test/build green |
| **CONFIGURATION REQUIRED** | Staging secrets not present in this environment |
| **LIVE E2E VERIFIED** | NOT VERIFIED — no Chargily/GitHub/Vercel/Supabase credentials |

**Production Ready for live sales: NO**

---

## What was deleted / moved

| Item | Action | Why |
|------|--------|-----|
| `template.json` (Manus numi-v1) | already in `docs/legacy/` | unused; old MySQL/V1 |
| `patches/` | already removed | broke install |
| Historical V4 docs | `docs/legacy/` | not current gate |
| `ComponentShowcase.tsx` | **deleted** | not in router; demo UI only |
| `Map.tsx` | **deleted** | not imported |
| `AIChatBox.tsx` | **deleted** | only used by showcase |
| PlanetScale env + status branch | **removed** from `env.ts` / `databaseProvider` / `preflight` | no create path; not v5 runtime |

## What was modified

| Item | Change |
|------|--------|
| `.env.example` | REQUIRED vs OPTIONAL sections; no PlanetScale |
| `server/databaseProvider.ts` | PlanetScale removed; syntax fixed |
| README / VERSION | v5.0.1-HARDENED only |

## What remains (and why)

| Area | Why kept |
|------|----------|
| stripe.ts / chargily.ts / paypal.ts | Three real providers → one `markOrderPaid` |
| github.ts / vercel.ts / provisioning.ts | Native delivery path |
| refund / backup / rollback | Hardening modules |
| Neon customer DB create | Optional when `CUSTOMER_DB_PROVIDER=neon` |
| Supabase status for customer DB | Status only; create not fully wired → NOT_CONFIGURED if selected without neon create |
| Radix UI / marketplace client | Production UI |
| Unit tests | Quality bar |

---

## Architecture (one path)

```
Create order → Checkout (provider) → Webhook / capture
→ markOrderPaid (server only, idempotent)
→ enqueue provision job
→ GitHub private repo (get-or-create) + Vercel (get-or-create)
→ optional Neon DB if provider=neon and configured
→ HTTP health must be true
→ delivery ready + accessGranted
→ /account + protected download
```

Isolation naming: `numi-{slug}-{purchaseId}` per purchase.

---

## TODO / MOCK / DEMO residual

| Match | Verdict |
|-------|---------|
| UI `placeholder=` on inputs | Not a production bug |
| Comments “never fake success” | Intentional guards |
| `docs/legacy/*` | Historical only |
| `date-fns@4.1.0` | Package version, not NUMI 4 |
| No `mysql2` / `mysqlTable` in server/client/drizzle | Confirmed |

---

## ENV (v5.0.1)

**Required to boot:** `DATABASE_URL`, `PUBLIC_APP_URL`, `JWT_SECRET`  

**Required for auth/admin:** `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID`  

**Optional sales:** Chargily and/or Stripe and/or PayPal keys  

**Optional auto-delivery:** `GITHUB_*`, `VERCEL_*`, `FEATURE_NATIVE_PROVISIONING`  

**Optional customer DB:** `CUSTOMER_DB_PROVIDER=none|neon`, Neon keys  

**Optional:** email, S3/backup, WhatsApp, Sentry  

---

## Tests run (this pass)

```text
pnpm install  → Done
pnpm check    → tsc --noEmit exit 0
pnpm test     → 6 files, 15 tests passed
pnpm build    → vite + esbuild OK
pnpm staging:verify / scripts/staging-verify.sh
              → NOT VERIFIED (7 secrets missing) — expected without .env
```

---

## What still blocks a real sellable product

1. Live Chargily (or Stripe) webhook + PAID on staging  
2. Live GitHub + Vercel provision with real tokens  
3. Product rows with real `sourceRepoUrl` + demos  
4. Customer A/B isolation proof  
5. Backup storage configured + restore drill  
6. Refund webhook wired and tested  
7. Operator domain + `PUBLIC_APP_URL` production  

Until those have evidence IDs, status remains **CODE VERIFIED** only.
