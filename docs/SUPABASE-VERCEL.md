# NUMI v5.0.1 — Deploy on Vercel + Supabase

## 1. Create Supabase project
1. Go to https://supabase.com → New project
2. After creation open **Project Settings → Database**
3. Copy the **Connection string** (URI)
4. Prefer the **Transaction pooler** (port **6543**) for Vercel serverless

Example:
```
postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

## 2. Environment variables on Vercel
In Vercel project → Settings → Environment Variables, set at minimum:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase pooler URI (port 6543) |
| `PUBLIC_APP_URL` | https://your-app.vercel.app |
| `JWT_SECRET` | long random string (≥32 chars) |
| `OWNER_OPEN_ID` | your OAuth subject |
| `OAUTH_SERVER_URL` / `VITE_APP_ID` | your OAuth provider |

Optional but needed for sales: Stripe / Chargily / PayPal + GitHub + Vercel tokens.

## 3. Local setup / first migrate
```bash
cp .env.example .env
# fill DATABASE_URL with Supabase pooler string

pnpm install
pnpm db:push          # or: pnpm drizzle-kit push
pnpm db:seed
pnpm preflight
pnpm build
```

## 4. Deploy to Vercel
```bash
# Install Vercel CLI if needed
npx vercel

# Or connect the Git repo in Vercel dashboard
# Build command: pnpm build
# Output / install: leave default (uses package.json)
```

After deploy, set the same env vars in Vercel and redeploy.

## 5. Automation worker
The GitHub Action (`.github/workflows/automation-worker.yml`) still works.
Point `NUMI_AUTOMATION_URL` to your Vercel URL.

## Notes
- `prepare: false` is set in the DB client (required for Supabase transaction pooler).
- Old PostgreSQL migrations were removed. Use `pnpm db:push` or generate new ones with `pnpm db:generate`.
- Background jobs run via the worker endpoint + GitHub Actions cron (not inside the Vercel function).

## Boutique note
This build defaults to **manual delivery** after payment. Enable native provisioning only after Chargily/payments are proven live.
