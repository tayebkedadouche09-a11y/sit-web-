# NUMI Architecture

## Entities
- **Master Template** — owner source of truth
- **Product Version** — sellable snapshot (slug, price, sourceRepo, demo)
- **Customer Instance** — independent GitHub repo + Vercel project (native) or external worker output

## Purchase flow
```
Browse → Product → Checkout session (provider configured)
→ Provider webhook / capture
→ markOrderPaid (amount + currency verified, idempotent)
→ purchase + delivery(queued) + license
→ automation job provision_purchase
→ requestProvisioning(native|external|manual)
→ health check
→ delivery ready + accessGranted
→ customer account links
```

## Honesty rules
- NOT_CONFIGURED when env missing
- READY only with real instanceUrl + source + license + health
- adminUrl never invented as `${url}/admin`
- documentationReady only when true assets exist
