# NUMI — Real Production Delivery Architecture

This document is the practical boundary between a visual marketplace and a system that can actually sell and hand over websites.

## 1. No fake product claims

- A missing demo URL is shown as unavailable.
- A demo URL is not considered live until an owner-triggered health check receives a successful HTTP response.
- New products cannot be published without a real demo URL and source repository.
- Seeded products are draft until their real resources are connected.
- NUMI never treats a screenshot, client flag, or success redirect as proof of payment.

## 2. Purchase-to-instance flow

`CUSTOMER → AUTH → ORDER → STRIPE CHECKOUT → STRIPE WEBHOOK → PAID → AUTOMATION JOB → GITHUB REPO → VERCEL PROJECT → HEALTH/READINESS → DELIVERY READY → ACCESS`

The payment webhook only verifies payment and enqueues work. Long-running provisioning is handled by the worker endpoint.

## 3. GitHub isolation

Each native customer instance gets a private repository named from the product slug and purchase ID. The source repository is copied rather than shared as the customer's runtime dependency.

The master repository can be changed or deleted without changing an already-created customer repository.

## 4. Hosting isolation

Vercel projects are created per customer instance. The delivery record stores the external project/deployment identifier and public URL. Provider tokens remain server-side.

## 5. Retry safety

Provisioning jobs have:
- correlation IDs;
- attempt counters;
- exponential retry delay;
- dead-letter state;
- idempotent delivery checks.

## 6. Manual fallback

Products can use an external provisioning worker or manual handover when native GitHub/Vercel automation is unsuitable. The storefront must describe the actual delivery mode rather than pretending that native automation exists.

## 7. Customer access rule

Payment verification creates the purchase record and license, but `accessGranted` remains false until delivery is ready. This prevents a customer from receiving a broken or half-provisioned website.

## 8. Payment options

NUMI supports a provider-adapter approach:
- Stripe Checkout for international/card payments.
- Chargily Pay V2 for DZD checkout flows, including EDAHABIA/CIB/Chargily App as exposed by Chargily's checkout page.
- PayPal Checkout for supported PayPal merchant/currency configurations.

Every provider must prove the payment server-side before `orders.status` becomes `paid`. Redirects alone never unlock delivery.

## 9. Provider references

Chargily Pay V2: https://dev.chargily.com/pay-v2/
PayPal Orders API: https://developer.paypal.com/api/rest/integration/orders-api/
