# Valmont-Pay integration (tenant `TENANT_KEY`, LIVE)

Storefront ↔ https://valmontpay.app, wired per the gateway's tenant contract
(`docs/tenant-integration.md` in the Valmont-Pay repo). Amounts are always
**GHS cedis (major units)** on this boundary; the gateway converts to pesewas
at the Paystack wire edge.

## Endpoints (Vercel Edge Functions)

| Route | Purpose |
|---|---|
| `POST /api/valmontpay/initialize` | Recomputes every price from the Supabase `products` table (client amounts are never charged), records the order as **Pending**, calls `POST https://valmontpay.app/api/transaction/initialize` with `Authorization: Bearer ${VALMONTPAY_SECRET_KEY}`, stores the returned `VP-…` reference on `orders.payment_reference`, and returns the hosted `pay_url` to the browser. |
| `POST /api/valmontpay/webhook` | Receiver for gateway webhooks. Verifies `x-valmontpay-signature` = HMAC-SHA512(rawBody, `VALMONTPAY_WEBHOOK_SECRET`) constant-time (401 on bad/missing), requires `x-valmontpay-tenant: TENANT_KEY`, and only a signed `charge.success` whose pesewa amount matches the stored order total can mark an order **Paid** (enforced inside the `confirm_order_paid()` RPC). Idempotent by reference; ignored events get a fast 200; retryable failures return explicit 5xx (the gateway retries with backoff for ~24 h). |

## Webhook receiver URL to register on the gateway

```
https://valmontgadgets.com/api/valmontpay/webhook
```

(Tenant dashboard → webhook URL. The gateway signs deliveries with the
tenant's dedicated webhook signing secret and sends `x-valmontpay-tenant`,
`x-valmontpay-event`, `x-valmontpay-signature`.)

## Environment (Vercel → Production)

Referenced by name only — values already exist in the project settings:

- `VALMONTPAY_SECRET_KEY` — tenant secret key (Bearer auth for `/api/transaction/initialize`)
- `VALMONTPAY_PUBLIC_KEY` — tenant public key (reserved; not needed by the hosted flow)
- `VALMONTPAY_WEBHOOK_SECRET` — webhook signing secret (HMAC-SHA512)

Supabase access uses the same public anon key the storefront already ships
(confined by RLS). No service-role secret is required: the migration adds two
narrow `SECURITY DEFINER` RPCs (`confirm_order_paid`,
`set_order_payment_reference`) as the only anon-reachable write paths.
`SUPABASE_URL` / `SUPABASE_ANON_KEY` may override the defaults if set.

## Database

Apply `supabase/migrations/20260805_valmontpay_pipeline.sql` (Supabase SQL
editor). It is idempotent: adds `orders.payment_reference`, seeds the catalog
(insert-if-missing only — never overwrites existing products), and creates the
two RPCs with grants for `anon`/`authenticated`/`service_role`.

## Local verification

```
npm ci
npm run typecheck   # syntax gate for all JS + structural check of app/page.tsx
npm test            # 28 unit tests for both endpoints (crypto, auth gate, pricing)
npm run smoke       # boots local mock Supabase + gateway, runs the real handlers
npm run build && npm run verify
```

## Security audit

`npm run verify` includes permanent checks that no Paystack keys
(`sk_live_/sk_test_/pk_live_/pk_test_`), no Valmont-Pay secret values, and no
server-side tenant auth ship in any browser bundle, and that checkout only
goes through `/api/valmontpay/initialize` (no client-built `amount=…` gateway
URLs).
