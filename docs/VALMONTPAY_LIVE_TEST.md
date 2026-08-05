# Valmont-Pay LIVE GH₵1 test plan (tenant `valmont-gadget`)

End-to-end verification against the **real** gateway and **real** Supabase
production project, using a temporary GH₵1 product so no customer or ledger
exposure exceeds one cedi. Run AFTER the migration is applied and the
webhook URL is registered on the gateway.

## 0. Preconditions

- [ ] Vercel Production deployed with `api/valmontpay/*` (check `https://valmontgadgets.com/api/valmontpay/webhook` with `GET` → **405**).
- [ ] `supabase/migrations/20260805_valmontpay_pipeline.sql` applied.
- [ ] Env vars present in Vercel Production: `VALMONTPAY_SECRET_KEY`, `VALMONTPAY_PUBLIC_KEY`, `VALMONTPAY_WEBHOOK_SECRET`.
- [ ] Gateway tenant `valmont-gadget` (LIVE): webhook URL = `https://valmontgadgets.com/api/valmontpay/webhook`, allowed domains include `valmontgadgets.com`.

## 1. Create the temp GH₵1 product

Supabase SQL editor:

```sql
INSERT INTO public.products (id, name, slug, price, compare_at_price, badge, stock, is_active)
VALUES ('vp-live-test-1ghc', 'VP Live Test — GH₵1 (do not fulfill)', 'vp-live-test-1ghc',
        1.00, 1.00, 'TEST', 5, true);
```

Free-delivery check: delivery is arranged post-payment (delivery_fee = 0 at
checkout), so nothing extra to configure — the charge must be exactly **GH₵1.00**.

## 2. Checkout

1. Open https://valmontgadgets.com (hard refresh), add **“VP Live Test — GH₵1”** to the bag.
2. Open checkout → fill shipping (any valid Ghana phone/email) → **Submit Secure Order**.
3. Expected:
   - Button shows “Opening secure payment…”, no client-side amount in the URL.
   - Redirect lands on `https://valmontpay.app/pay.html?access_code=ac_…`.
   - Gateway page shows merchant branding for Valmont Gadgets and amount **GH₵ 1.00** (not 100).
4. In Supabase (Table editor → orders), find the newest row:
   - `status = Pending`, `total = 1.00`, `order_number = VG-…`
   - `payment_reference` starts with the gateway reference (VP-/access ref) once initialize returns.

## 3. Pay GH₵1 (test channel or smallest real charge)

Complete the payment on the gateway page with any successful LIVE/test-capable
method the tenant supports.

## 4. Verify the round trip

Within ~60s (gateway forwards after Paystack confirmation):

- [ ] Return screen (`order-confirmed.html?reference=VG-…&status=success`) shows **“Order Received — Pending Confirmation”** (never “paid”).
- [ ] Vercel function logs show `[VALMONTPAY-WEBHOOK] charge.success VG-… -> paid (pesewas=100)`.
- [ ] Supabase orders row: `status = Paid`, `admin_notes` contains `[Valmont-Pay] … charge.success verified for …`.
- [ ] Supabase products row `vp-live-test-1ghc`: `stock` decremented 5 → **4** (exactly once).
- [ ] Gateway dashboard → webhook deliveries: 200 recorded for the tenant.

## 5. Idempotency probe

Replay the same delivery from the gateway admin (“Redeliver”) or wait for a
gateway retry:

- [ ] Receiver returns 200 (`already_paid`), order stays Paid, stock stays **4** (no double decrement).

## 6. Negative probes (optional but recommended)

```bash
# Unsigned request → must be a clean 401, no 5xx
curl -i -X POST https://valmontgadgets.com/api/valmontpay/webhook \
  -H 'content-type: application/json' \
  -d '{"event":"charge.success","data":{"reference":"VG-FAKE","status":"success","amount":1}}'

# Wrong tenant → 401 even with a valid signature for another secret
```

## 7. Cleanup

```sql
UPDATE public.orders SET status = 'Cancelled',
  admin_notes = coalesce(admin_notes,'') || ' [LIVE-TEST cleanup]'
WHERE order_number LIKE 'VG-%' AND total = 1.00
  AND order_number = (SELECT order_number FROM public.orders
                      WHERE customer_id LIKE 'cust-%' ORDER BY created_at DESC LIMIT 1); -- narrow to the test order

DELETE FROM public.products WHERE id = 'vp-live-test-1ghc';
```

- Refund/void the GH₵1 charge on the gateway/Paystack side if it was a real charge.
- Remove the test product from any cached storefront views (hard refresh / bump `CACHE_NAME` if needed).

## Pass criteria (summary)

| Step | Expected |
|---|---|
| Checkout redirect | hosted pay.html, amount GH₵ 1.00, access_code flow |
| Order before payment | `Pending`, total 1.00, VP reference stored |
| Return screen | “Pending Confirmation” wording |
| Webhook | signature verified, pesewas=100 matches, → Paid |
| Stock | decremented exactly once |
| Replay | 200, no state change |
| Unsigned POST | bare 401 |
