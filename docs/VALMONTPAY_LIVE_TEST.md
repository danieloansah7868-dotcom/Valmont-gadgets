# Controlled Valmont-Pay live GH₵1 test

Run this against production only after the migration, post-checks, application deployment, and non-payment smoke tests pass. Keep public checkout in maintenance mode until cleanup is complete. Use a unique release identifier and a dedicated operations phone/email; never use invented customer contact data.

The test creates an active GH₵1 product and a zero-fee release-validation region so the exact payment is GH₵1. These records must exist only during the maintenance window.

## 1. Preconditions

- [ ] A named operator and reviewer are present.
- [ ] The release ticket contains the exact commit/deployment/migration checksum and backup/PITR reference.
- [ ] The externally deployed webhook returns 405 to GET and 401 to an unsigned POST.
- [ ] The Valmont-Pay tenant webhook is `https://valmontgadgets.com/api/valmontpay/webhook`.
- [ ] Production secrets are configured and no production secret is exposed to browser code.
- [ ] Public checkout is disabled for maintenance.
- [ ] Gateway/refund access and Vercel/Supabase logs are open for observation.

Choose a unique lowercase identifier such as `vp-live-20260814-a`; use it below as `<RELEASE_ID>`.

## 2. Create narrowly scoped test configuration

Run in the Supabase SQL editor and retain the result:

```sql
INSERT INTO public.delivery_fees (region, fee, sort_order, is_active)
VALUES ('Release validation only', 0, 99999, true)
ON CONFLICT (region) DO UPDATE
SET fee = 0, sort_order = 99999, is_active = true, updated_at = timezone('utc', now());

INSERT INTO public.products (
  id, name, slug, price, compare_at_price, wholesale_price,
  description, badge, stock, images, colors, storage_options, is_active
)
VALUES (
  '<RELEASE_ID>', 'Release payment validation — do not fulfil', '<RELEASE_ID>',
  1.00, 1.00, 1.00, 'Operations-only live payment validation', 'TEST',
  5, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true
);
```

The unique product insert must fail rather than overwrite an existing product. If it conflicts, choose a new identifier.

## 3. Initialize through the real public API

From the production site's browser console, substitute the test operator's valid contact fields and release ID. Do not include `amount`, `price`, `subtotal`, `total`, or `delivery_fee` anywhere in the request.

```js
const response = await fetch('/api/valmontpay/initialize', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    items: [{ id: '<RELEASE_ID>', qty: 1 }],
    customer: {
      name: 'Valmont Release Operator',
      phone: '<VALID_GHANA_PHONE>',
      email: '<OPERATIONS_EMAIL>',
      area: 'Release validation',
      street: 'Operations',
      full_address: 'Operations-only live payment validation'
    },
    payment_method: 'Valmont-Pay',
    delivery_region: 'Release validation only'
  })
});
const result = await response.json();
console.log(response.status, result);
```

Expected result:

- HTTP 200 and `status: true`;
- `subtotal: 1`, `delivery_fee: 0`, `total: 1`;
- an `order_number` beginning `VG-` and a non-empty gateway `reference`;
- an HTTPS `url` on `valmontpay.app`;
- no secret, stack trace, or service-role detail in the response.

Record the order number/reference, then navigate manually to `result.url`. The hosted page must display **GH₵1.00** and Valmont Gadgets tenant branding.

Before paying, verify in Supabase:

```sql
SELECT order_number, status, subtotal, delivery_fee, total,
       delivery_region, payment_reference,
       inventory_reserved_at, inventory_released_at, reservation_expires_at
FROM public.orders
WHERE order_number = '<ORDER_NUMBER>';

SELECT id, stock, is_active
FROM public.products
WHERE id = '<RELEASE_ID>';
```

Expected: Pending, 1/0/1 totals, correct region/reference, active reservation, no release, and product stock 4 (reserved once).

## 4. Pay and verify

Complete the GH₵1 payment using an approved live method.

Within the gateway retry window:

- [ ] The return page says **“Order Received — Pending Confirmation”**, never that the redirect itself proves payment.
- [ ] Gateway delivery history records a signed `charge.success` with HTTP 200.
- [ ] Vercel logs record the order/reference outcome without secrets or full payloads.
- [ ] The order is Paid, `paid_at` is populated, and its stored reference is unchanged.
- [ ] Product stock remains 4; payment confirmation does not decrement a reservation a second time.

```sql
SELECT order_number, status, total, payment_reference, paid_at,
       inventory_reserved_at, inventory_released_at, admin_notes
FROM public.orders
WHERE order_number = '<ORDER_NUMBER>';

SELECT id, stock FROM public.products WHERE id = '<RELEASE_ID>';
```

## 5. Replay/idempotency test

Use the gateway's authenticated **redeliver** action for that same event. Never reconstruct the production signature by copying its secret into a terminal.

Expected:

- receiver returns HTTP 200 with the already-paid outcome;
- order/reference/paid timestamp remain stable;
- product stock remains exactly 4;
- no duplicate order is created.

## 6. Negative signature probe

An unsigned fake event must return 401 and make no database change:

```bash
curl -i -X POST https://valmontgadgets.com/api/valmontpay/webhook \
  -H 'content-type: application/json' \
  -d '{"event":"charge.success","data":{"reference":"VG-FAKE","status":"success","amount":100}}'
```

Do not send guessed signatures or real payment/customer payloads.

## 7. Cleanup and refund

Preserve the Paid order as an immutable financial/audit record. Do **not** relabel it Cancelled or delete it.

```sql
BEGIN;

UPDATE public.products
SET is_active = false,
    badge = 'COMPLETED TEST',
    updated_at = timezone('utc', now())
WHERE id = '<RELEASE_ID>';

UPDATE public.delivery_fees
SET is_active = false,
    updated_at = timezone('utc', now())
WHERE region = 'Release validation only';

COMMIT;
```

Then:

- refund/void the GH₵1 transaction through the gateway/processor and record the refund reference;
- verify the test product and region are inactive;
- remove checkout maintenance mode;
- monitor checkout/webhook logs for at least 30 minutes;
- attach redacted initialization, database, gateway delivery/replay, refund, and cleanup evidence to the release ticket.

## Pass criteria

Every check must pass: server-computed GH₵1 total, Pending reservation, hosted gateway origin, signed Paid transition, stable reference, one stock decrement total, replay idempotency, unsigned 401, audit-safe cleanup, and refund. If any check fails, disable checkout and follow the rollback/incident section of [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md).
