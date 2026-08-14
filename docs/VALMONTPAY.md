# Valmont-Pay integration

Tenant: `valmont-gadget`

Production gateway: `https://valmontpay.app`
Payment boundary unit: **GHS major units**; the gateway owns conversion to pesewas at its processor boundary.

## Endpoints

### `POST /api/valmontpay/initialize`

The browser sends product identifiers/quantities, customer and delivery details, an idempotency key, and optionally a Supabase bearer token. It never supplies an authoritative price.

The endpoint:

1. bounds and parses the JSON body and applies an IP rate limit;
2. rejects legacy client-priced fields with `410 Gone`;
3. verifies an optional bearer token through Supabase Auth and uses only the returned account UUID;
4. loads active products using the server-only Supabase service role;
5. invokes `create_pending_order`, which computes catalog/delivery totals and reserves stock atomically;
6. calls Valmont-Pay with `Authorization: Bearer ${VALMONTPAY_SECRET_KEY}`;
7. validates that the returned checkout URL uses the expected HTTPS gateway origin;
8. binds the gateway reference to the Pending order; and
9. returns only the hosted checkout URL and non-sensitive order data, including the stored authoritative `retail`/`dealer` pricing tier.

An idempotency-key retry reuses the matching order. A conflicting payload fails closed. If gateway initialization fails, the reservation is released rather than leaving inventory stranded.

The same function hosts the rewritten SMS opt-in and admin lead routes. Public opt-in writes are rate-limited and performed with the service role; the admin read requires a verified admin bearer identity.

### `POST /api/valmontpay/webhook`

Webhook URL:

```text
https://valmontgadgets.com/api/valmontpay/webhook
```

The receiver reads bounded raw bytes and validates, before JSON trust:

- `x-valmontpay-signature` as constant-time HMAC-SHA512 with `VALMONTPAY_WEBHOOK_SECRET`;
- `x-valmontpay-tenant` equals `valmont-gadget`;
- the supported `charge.success` event and successful gateway status;
- the order/reference format and integer amount in pesewas.

`confirm_order_paid` is callable only by `service_role`. It checks the stored gateway reference and amount, transitions the order once, and consumes the existing reservation in one transaction. Replays return `already_paid` without changing inventory. Amount/reference/state/stock conflicts remain unpaid and produce an operator-visible result. Retryable database failures return 5xx; invalid signatures return 401; terminal signed conflicts return 200 to avoid an endless retry storm.

### Payment return page

`order-confirmed.html` says **“Order Received — Pending Confirmation.”** A gateway redirect is cosmetic and cannot mark an order paid. The signed webhook is the only payment authority.

## Secret boundary

Required server-only values:

- `VALMONTPAY_SECRET_KEY`
- `VALMONTPAY_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended explicit project values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (public by design, but still managed as configuration)

Recommended distributed limiter values:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

`VALMONTPAY_PUBLIC_KEY` and a browser Paystack/Valmont-Pay SDK are not used by this hosted flow. No service-role key or gateway secret may appear in HTML, generated JavaScript, source maps, the asset manifest, logs, or client responses. `npm run verify` scans the production path for known secret patterns and obsolete client payment loaders.

## Database contract

Apply the canonical migration:

```text
supabase/migrations/20260814000100_production_hardening.sql
```

It adds authoritative delivery calculation, payment/reservation state, account-bound order reads, authenticated moderated reviews, authenticated Daily Drop claims, a public safe-catalog projection, approved-account-only dealer prices, authoritative dealer-priced checkout, RLS, and least-privilege grants. All overloads of payment mutation RPCs are revoked from `PUBLIC`, `anon`, and `authenticated`; only `service_role` receives their exact signatures.

See [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md) for backup, staging, production, verification, and rollback procedure. Do not infer remote migration state from local test success.

## Automated verification

```bash
npm ci
npm run ci
npm audit --audit-level=high
```

The tests cover malformed/oversized requests, rate limits, Auth verification, client-price rejection, anonymous/pending/suspended/approved dealer pricing parity, catalog repricing, delivery authority, stable idempotent pricing tiers, reservation cleanup, gateway origin enforcement, HMAC and tenant checks, amount/reference conflicts, webhook replay, safe errors, admin authorization, migration grants/RLS, and browser identity/storage isolation.
