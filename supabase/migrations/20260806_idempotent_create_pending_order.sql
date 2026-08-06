-- =============================================================================
-- Valmont Gadgets — idempotent create_pending_order RPC
--
-- Problem
-- -------
-- When the browser has a `valmont_pending_order` in localStorage from a
-- previous checkout attempt and the customer retries, the server endpoint
-- would create a brand-new order each time. Worse, any path that tried to
-- SELECT from public.orders with the anon key would fail with SQLSTATE 42501
-- ("permission denied for table orders") because the RLS migration correctly
-- revoked all anon table privileges.
--
-- Fix
-- ---
-- 1. Add `orders.idempotency_key TEXT` column (nullable, indexed).
-- 2. Extend create_pending_order() with an optional p_idempotency_key.
--    When provided:
--      a) If a matching unpaid Pending order exists (same customer + key),
--         UPDATE its items/total (in case the cart changed) and RETURN it.
--      b) Otherwise, INSERT with the key.
--    This is a single round-trip, single source of truth.
-- 3. The server endpoint computes the key as SHA-256(customer_id + sorted
--    cart items) so identical retry attempts hit the same order.
--
-- Safe to re-run. Runs after 20260806_create_pending_order.sql.
-- =============================================================================

-- ── 1. Idempotency key column + index ────────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Partial unique index: only one Pending order per (customer, key).
-- Paid/Cancelled orders release the key so the customer can reorder.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_pending
  ON public.orders (customer_id, idempotency_key)
  WHERE status = 'Pending'
    AND idempotency_key IS NOT NULL;

-- ── 2. Idempotent create_pending_order() ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_pending_order(
  p_order_number    text,
  p_customer_id     text,
  p_items           jsonb,
  p_subtotal        numeric,
  p_delivery_fee    numeric,
  p_total           numeric,
  p_payment_method  text,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item                  jsonb;
  v_product_id            text;
  v_product_name          text;
  v_product_price         numeric;
  v_quantity              integer;
  v_subtotal              numeric := 0;
  v_canonical_items       jsonb := '[]'::jsonb;
  v_supplied_unit_price   numeric;
  v_supplied_line_total   numeric;
  v_customer_id           text;
  v_order_id              text;
  v_existing              record;
  v_idem_key              text;
BEGIN
  -- ── Validate inputs ────────────────────────────────────────────────────────
  IF p_order_number IS NULL
     OR length(btrim(p_order_number)) > 64
     OR btrim(p_order_number) !~ '^VG-[A-Z0-9]+-[A-Z0-9]{9}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid order_number';
  END IF;

  IF p_payment_method IS NULL
     OR length(btrim(p_payment_method)) = 0
     OR length(btrim(p_payment_method)) > 60 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid payment_method';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'items must be a non-empty array of at most 50 entries';
  END IF;

  IF p_delivery_fee IS NULL
     OR p_delivery_fee < 0
     OR p_delivery_fee::text = 'NaN'
     OR p_delivery_fee::text = 'Infinity'
     OR p_delivery_fee::text = '-Infinity' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid delivery_fee';
  END IF;

  IF p_subtotal IS NULL
     OR p_subtotal < 0
     OR p_subtotal::text = 'NaN'
     OR p_subtotal::text = 'Infinity'
     OR p_subtotal::text = '-Infinity'
     OR p_total IS NULL
     OR p_total < 0
     OR p_total::text = 'NaN'
     OR p_total::text = 'Infinity'
     OR p_total::text = '-Infinity' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid order totals';
  END IF;

  IF p_customer_id IS NOT NULL AND length(btrim(p_customer_id)) > 120 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid customer_id';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(btrim(p_idempotency_key)) > 128 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'idempotency_key too long (max 128 chars)';
  END IF;

  SELECT c.id INTO v_customer_id
  FROM public.customers AS c
  WHERE c.id = NULLIF(btrim(p_customer_id), '')
  LIMIT 1;

  v_idem_key := NULLIF(btrim(coalesce(p_idempotency_key, '')), '');

  -- ── 3. Idempotency check: look for an existing Pending order ──────────────
  IF v_idem_key IS NOT NULL AND v_customer_id IS NOT NULL THEN
    SELECT o.id, o.order_number
      INTO v_existing
    FROM public.orders o
    WHERE o.customer_id = v_customer_id
      AND o.idempotency_key = v_idem_key
      AND o.status = 'Pending'
    ORDER BY o.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      -- Re-validate the cart against current catalog prices before returning.
      -- This catches the edge case where a product was deactivated or
      -- re-priced between the first attempt and the retry.
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
      LOOP
        v_product_id := NULLIF(btrim(v_item->>'product_id'), '');
        IF v_product_id IS NULL THEN CONTINUE; END IF;
        IF coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN CONTINUE; END IF;
        v_quantity := (v_item->>'quantity')::integer;

        SELECT p.name, round(p.price, 2)
          INTO v_product_name, v_product_price
        FROM public.products AS p
        WHERE p.id = v_product_id AND p.is_active = true AND p.price > 0
        LIMIT 1;

        IF NOT FOUND THEN
          RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = format('product %s is no longer available (retry blocked)', v_product_id);
        END IF;
      END LOOP;

      -- Refresh the order with current catalog prices (items, totals).
      -- The canonical items are rebuilt from the catalog below, same as a fresh insert.
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
      LOOP
        v_product_id := NULLIF(btrim(v_item->>'product_id'), '');
        IF v_product_id IS NULL OR length(v_product_id) > 120 THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item needs a product_id';
        END IF;
        IF coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item needs a positive quantity';
        END IF;
        v_quantity := (v_item->>'quantity')::integer;
        IF v_quantity > 50 THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'item quantity exceeds the limit';
        END IF;

        SELECT p.name, round(p.price, 2)
          INTO v_product_name, v_product_price
        FROM public.products AS p
        WHERE p.id = v_product_id AND p.is_active = true AND p.price > 0
        LIMIT 1;

        IF NOT FOUND THEN
          RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = format('product %s is unavailable', v_product_id);
        END IF;

        v_subtotal := v_subtotal + (v_product_price * v_quantity);
        v_canonical_items := v_canonical_items || jsonb_build_array(
          jsonb_build_object(
            'product_id', v_product_id,
            'name', v_product_name,
            'quantity', v_quantity,
            'unit_price', v_product_price,
            'line_total', round(v_product_price * v_quantity, 2),
            'selected_color', NULLIF(btrim(coalesce(v_item->>'selected_color', '')), ''),
            'selected_storage', NULLIF(btrim(coalesce(v_item->>'selected_storage', '')), '')
          )
        );
      END LOOP;

      IF round(p_subtotal, 2) <> round(v_subtotal, 2) THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'subtotal does not match active catalog prices';
      END IF;

      IF round(p_total, 2) <> round(p_subtotal + p_delivery_fee, 2) THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'total does not equal subtotal plus delivery_fee';
      END IF;

      -- Update the existing order with fresh catalog prices.
      UPDATE public.orders
      SET items = v_canonical_items,
          subtotal = round(p_subtotal, 2),
          delivery_fee = round(p_delivery_fee, 2),
          total = round(p_total, 2),
          payment_method = btrim(p_payment_method),
          updated_at = timezone('utc'::text, now())
      WHERE id = v_existing.id;

      RETURN jsonb_build_object(
        'id', v_existing.id,
        'order_number', v_existing.order_number,
        'idempotent', true
      );
    END IF;
  END IF;

  -- ── 4. Fresh insert path (no idempotency match) ───────────────────────────
  v_subtotal := 0;
  v_canonical_items := '[]'::jsonb;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item must be an object';
    END IF;

    v_product_id := NULLIF(btrim(v_item->>'product_id'), '');
    IF v_product_id IS NULL OR length(v_product_id) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item needs a product_id';
    END IF;

    IF coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item needs a positive quantity';
    END IF;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity > 50 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'item quantity exceeds the limit';
    END IF;

    SELECT p.name, round(p.price, 2)
      INTO v_product_name, v_product_price
    FROM public.products AS p
    WHERE p.id = v_product_id
      AND p.is_active = true
      AND p.price > 0
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = format('product %s is unavailable', v_product_id);
    END IF;

    IF NULLIF(btrim(v_item->>'unit_price'), '') IS NOT NULL THEN
      BEGIN
        v_supplied_unit_price := round((v_item->>'unit_price')::numeric, 2);
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid item unit_price';
      END;
      IF v_supplied_unit_price <> v_product_price THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('unit_price mismatch for product %s', v_product_id);
      END IF;
    END IF;

    IF NULLIF(btrim(v_item->>'line_total'), '') IS NOT NULL THEN
      BEGIN
        v_supplied_line_total := round((v_item->>'line_total')::numeric, 2);
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid item line_total';
      END;
      IF v_supplied_line_total <> round(v_product_price * v_quantity, 2) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('line_total mismatch for product %s', v_product_id);
      END IF;
    END IF;

    IF length(coalesce(v_item->>'selected_color', '')) > 60
       OR length(coalesce(v_item->>'selected_storage', '')) > 60 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'selected product option is too long';
    END IF;

    v_subtotal := v_subtotal + (v_product_price * v_quantity);
    v_canonical_items := v_canonical_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id,
        'name', v_product_name,
        'quantity', v_quantity,
        'unit_price', v_product_price,
        'line_total', round(v_product_price * v_quantity, 2),
        'selected_color', NULLIF(btrim(v_item->>'selected_color'), ''),
        'selected_storage', NULLIF(btrim(v_item->>'selected_storage'), '')
      )
    );
  END LOOP;

  IF round(p_subtotal, 2) <> round(v_subtotal, 2) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'subtotal does not match active catalog prices';
  END IF;

  IF round(p_total, 2) <> round(p_subtotal + p_delivery_fee, 2) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'total does not equal subtotal plus delivery_fee';
  END IF;

  INSERT INTO public.orders (
    order_number,
    customer_id,
    items,
    subtotal,
    delivery_fee,
    total,
    status,
    payment_method,
    idempotency_key
  ) VALUES (
    btrim(p_order_number),
    v_customer_id,
    v_canonical_items,
    round(p_subtotal, 2),
    round(p_delivery_fee, 2),
    round(p_total, 2),
    'Pending',
    btrim(p_payment_method),
    v_idem_key
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', btrim(p_order_number),
    'idempotent', false
  );
END;
$$;

-- ── 3. Grants (revoke the old signature, grant the new one) ─────────────────
REVOKE ALL ON FUNCTION public.create_pending_order(text, text, jsonb, numeric, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_pending_order(text, text, jsonb, numeric, numeric, numeric, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_pending_order(text, text, jsonb, numeric, numeric, numeric, text, text)
  TO anon, authenticated, service_role;

-- ── 4. Policy / privilege regression assertions ─────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND roles && ARRAY['anon', 'public']::name[]
      AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) THEN
    RAISE EXCEPTION 'orders must have no anon/PUBLIC table policy; inspect pg_policies';
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.create_pending_order(text,text,jsonb,numeric,numeric,numeric,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must be granted EXECUTE on create_pending_order(8-arg)';
  END IF;
  IF NOT has_function_privilege(
    'authenticated',
    'public.create_pending_order(text,text,jsonb,numeric,numeric,numeric,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated must be granted EXECUTE on create_pending_order(8-arg)';
  END IF;
  IF NOT has_function_privilege(
    'service_role',
    'public.create_pending_order(text,text,jsonb,numeric,numeric,numeric,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role must be granted EXECUTE on create_pending_order(8-arg)';
  END IF;

  -- Idempotency column must exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'idempotency_key'
  ) THEN
    RAISE EXCEPTION 'orders.idempotency_key column is missing';
  END IF;

  -- Idempotency index must exist.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND indexname = 'idx_orders_idempotency_pending'
  ) THEN
    RAISE EXCEPTION 'idx_orders_idempotency_pending index is missing';
  END IF;
END
$$;
