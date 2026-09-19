# NUMI — Seller Package

## Product
NUMI is a full-stack marketplace template for selling ready-made websites/digital products.

## Included
- React + Vite storefront
- Express + tRPC API
- PostgreSQL/Drizzle data layer
- Customer authentication
- Owner/admin operations layer
- Payment integration points for Stripe, Chargily and PayPal
- Optional GitHub + Vercel provisioning
- Digital delivery/download flow
- Production-oriented validation, idempotency and retry logic

## Buyer setup
1. Copy `.env.example` to `.env`.
2. Configure the database and application URL.
3. Configure the authentication values.
4. Configure one live payment provider before accepting real orders.
5. Configure GitHub/Vercel provisioning only if automatic customer delivery is required.
6. Run the documented checks before production deployment.

## Important
Optional integrations are explicitly configuration-gated. A buyer must not assume that an unset integration is active.

## Recommended listing position
Full-stack marketplace / digital-product commerce script.

## License
The repository currently declares MIT. Review the license before marketplace submission and change it only if your intended commercial terms require a different license.

## Release checklist
- No secrets or private accounts in the ZIP
- Build passes
- Typecheck passes
- Tests pass
- Production environment variables documented
- Demo URL available
- Screenshots prepared
- Third-party assets checked for redistribution rights
