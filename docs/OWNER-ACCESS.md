# Owner / Admin access (NUMI)

## Who can open `/admin`?

Only users with `role = admin`.

## How you become the only admin

1. Set in `.env`:
   ```
   OWNER_OPEN_ID=<your OAuth open id / subject>
   ```
2. Sign in with that same identity (OAuth).
3. On login, the server promotes that account to `admin`.

All `admin.*` tRPC procedures use `adminProcedure`:
- not logged in → UNAUTHORIZED
- logged in but not admin → FORBIDDEN

The `/admin` page also blocks non-admins in the UI ("Owner access only").

## What the owner panel controls

| Tab | Control |
|-----|---------|
| Overview | Stats / navigation |
| Products | Create, edit, publish, archive, delete website products |
| Categories | Taxonomy for the storefront |
| Orders | Order status / fulfillment transitions |
| Deliveries | Manual delivery URLs, readiness flags |
| Coupons | Launch discounts |
| Reviews | Moderate feedback |
| System | Integration truth (CONNECTED / NOT_CONFIGURED) |

Storefront sky/weather/sound is visitor-side preference, not owner content.

## Security notes

- Never commit `.env`
- Keep `OWNER_OPEN_ID` secret to your identity only
- Admin APIs are not public; UI hide is not enough — server enforces role
