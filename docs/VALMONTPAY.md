# Valmont-Pay integration (tenant `valmont-gadget`, LIVE)

Storefront ↔ https://valmontpay.app, wired per the gateway's tenant contract
(`docs/tenant-integration.md` in the Valmont-Pay repo). Amounts are always
**GHS cedis (major units)** on this boundary; the gateway converts to pesewas
at the Paystack wire edge. Allowed callback domains on the tenant:
`valmontgadgets.com`, `www.valmontgadgets.com`, `localhost`.

## Endpoints (Vercel Edge Functions)

| Route | Purpose |
|---|---|
| `POST /api/valmontpay/initialize` | Recomputes every price from the Supabase `products` table — client amounts are never accepted (a request carrying any client-priced field is refused with **410 Gone**, the legacy flow's retirement code). Records the order as **Pending** first, calls `POST https://valmontpay.app/api/transaction/initialize` with `Authorization: Bearer ${VALMONTPAY_SECRET_KEY}`, stores the returned `VP-…` reference on `orders.payment_reference`, and returns the hosted `pay_url` to the browser. |
| `POST /api/valmontpay/webhook` | Receiver for gateway webhooks. Verifies `x-valmontpay-signature` = HMAC-SHA512(raw body, `VALMONTPAY_WEBHOOK_SECRET`) constant-time → **clean 401** on missing/invalid (never a crash). Requires `x-valmontpay-tenant: valmont-gadget`. Processes only signed `charge.success` **with `data.status === 'success'`** whose webhook pesewas exactly match the stored order total; everything else is a fast 200 (ignored) or 400. Explicit 5xx only for retryable infrastructure failures (DB unreachable, order row not yet landed). |

### Idempotency & stock

Marking Paid and decrementing product stock both happen inside the
`confirm_order_paid()` SECURITY DEFINER RPC in ONE transaction. Repeat
webhook deliveries hit the `already_paid` branch before either effect —
no double stock decrement, no duplicate state changes.

### Payment-return screens

`order-confirmed.html` always shows **“Order Received — Pending
Confirmation”** — never “paid”. The signed webhook is the only path that
flips an order to Paid; the redirect back from the gateway is cosmetic.

## Webhook receiver URL to register on the gateway

```
https://valmontgadgets.com/api/valmontpay/webhook
```

(Tenant dashboard → webhook URL for `valmont-gadget`. The gateway signs
deliveries with the tenant's dedicated webhook signing secret and sends
`x-valmontpay-tenant`, `x-valmontpay-event`, `x-valmontpay-signature`.)

## Environment (Vercel → Production)

Referenced by name only — values already exist in the project settings:

- `VALMONTPAY_SECRET_KEY` — tenant secret key (Bearer auth for `/api/transaction/initialize`)
- `VALMONTPAY_PUBLIC_KEY` — tenant public key (reserved; not needed by the hosted flow)
- `VALMONTPAY_WEBHOOK_SECRET` — webhook signing secret (HMAC-SHA512)

Supabase access uses the same public anon key the storefront already ships
(confined by RLS). No service-role secret is required: the migrations add three
narrow `SECURITY DEFINER` RPCs (`create_pending_order`, `confirm_order_paid`,
`set_order_payment_reference`) as the only anon-reachable order/payment write
paths. `public.orders` has no anon/PUBLIC SELECT policy (or direct anon table
write policy); the create RPC returns only the new id and order number.
`SUPABASE_URL` / `SUPABASE_ANON_KEY` may override the defaults if set.

## Database

Apply `supabase/migrations/20260805_valmontpay_pipeline.sql`, then
`supabase/migrations/20260806_create_pending_order.sql` (Supabase SQL editor).
Both are idempotent. The first adds `orders.payment_reference`, seeds the
catalog (insert-if-missing only — never overwrites existing products), and
creates the payment RPCs. The second creates the SECURITY DEFINER pending-order
RPC, removes anon/PUBLIC orders table policies and direct privileges, and
asserts the live `pg_policies` set before completing.

## Local verification

```
npm ci
npm run typecheck   # syntax gate for all JS + structural check of app/page.tsx
npm test            # 37 unit tests: crypto, auth gate, status gate, pesewa match,
                    # 410 retirement, idempotency, server repricing, client-bug regressions
npm run test:integration # schema/RPC integration, RLS RETURNING regression, pg_policies assertion
npm run smoke       # boots local mock Supabase + gateway, drives the real handlers
                    # (incl. manual UNSIGNED webhook → bare 401)
npm run build && npm run verify   # prerender + hydration + full audit incl. bundle secret scan
```

## Security audit

`npm run verify` includes permanent checks that no Paystack keys
(`sk_live_/sk_test_/pk_live_/pk_test_`), no Valmont-Pay secret values, and no
server-side tenant auth ship in any browser bundle, and that checkout only
goes through `/api/valmontpay/initialize` (no client-built `amount=…` gateway
URLs). `scripts/deep-audit.js` performs the site-wide crawl (assets, handlers,
SEO, pricing, localStorage safety).

## Live GH₵1 test

See `docs/VALMONTPAY_LIVE_TEST.md` for the end-to-end GH₵1 verification run
(temp product, VP-reference check, Paid status, Supabase verification, cleanup).
