# NUMI v5.0.1-HARDENED

Personal **website boutique**: sell ready-made sites with payment verification and optional automatic isolated delivery (GitHub private copy + Vercel).

## Stack (current only)

- React + Vite + tRPC + Express  
- **PostgreSQL** via Supabase (`postgres` + Drizzle `pgTable`)  
- Payments: Chargily / Stripe / PayPal (server-side PAID only)  
- Provisioning: GitHub + Vercel when configured; otherwise explicit `NOT_CONFIGURED`

## Quick start

```bash
pnpm install
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, PUBLIC_APP_URL
pnpm exec drizzle-kit push
pnpm db:seed
pnpm dev
```

## Quality

```bash
pnpm check && pnpm test && pnpm build
pnpm preflight
bash scripts/staging-verify.sh   # requires staging secrets
```

## Docs

| Doc | Purpose |
|-----|---------|
| `docs/LOCAL-VSCODE.md` | Local setup |
| `docs/DEPLOY-FULL.md` | Deploy + env |
| `docs/AUTO-DELIVERY.md` | Native provisioning |
| `docs/BACKUP-RESTORE.md` | App snapshot vs Supabase PITR |
| `docs/CUSTOMER-TEMPLATE.md` | How buyer instances are sourced |
| `docs/PRODUCTION-READINESS-v5.0.1-FINAL.md` | Readiness matrix |
| `docs/legacy/` | Historical V1–V4 material only |

## Version

See `VERSION.md`. Do not mix with V1/V4 runtimes — they are not active.


<!-- NUMI production sync: owner-auth hardening -->
