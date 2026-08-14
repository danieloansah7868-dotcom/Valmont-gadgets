-- =============================================================================
-- Valmont Gadgets — production security and checkout authority
--
-- This is the canonical migration for the deployed checkout contract. It:
--   * makes every payment/customer mutation RPC service-role-only;
--   * computes delivery and catalog totals in PostgreSQL;
--   * reserves stock atomically when a Pending order is created;
--   * restores expired/cancelled reservations exactly once;
--   * makes payment confirmation idempotent without double-decrementing stock;
--   * replaces client-authored Daily Drop prizes and review verification.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Delivery configuration ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_fees (
  region text PRIMARY KEY,
  fee numeric(12,2) NOT NULL CHECK (fee >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.delivery_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.delivery_fees (region, fee, sort_order) VALUES
  ('Accra Central', 35, 10),
  ('Tema', 45, 20),
  ('East Legon / Airport', 40, 30),
  ('Madina / Adenta', 45, 40),
  ('Kasoa', 60, 50),
  ('Other Greater Accra', 55, 60),
  ('Outside Greater Accra', 80, 70)
ON CONFLICT (region) DO NOTHING;

INSERT INTO public.delivery_settings (key, value) VALUES
  ('free_over', '5000'::jsonb),
  ('default_fee', '80'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.delivery_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_fees_public_read ON public.delivery_fees;
CREATE POLICY delivery_fees_public_read ON public.delivery_fees
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_valmont_admin());
DROP POLICY IF EXISTS delivery_fees_admin_write ON public.delivery_fees;
CREATE POLICY delivery_fees_admin_write ON public.delivery_fees
  FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS delivery_settings_public_read ON public.delivery_settings;
CREATE POLICY delivery_settings_public_read ON public.delivery_settings
  FOR SELECT TO anon, authenticated USING (key IN ('free_over', 'default_fee') OR public.is_valmont_admin());
DROP POLICY IF EXISTS delivery_settings_admin_write ON public.delivery_settings;
CREATE POLICY delivery_settings_admin_write ON public.delivery_settings
  FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

GRANT SELECT ON public.delivery_fees, public.delivery_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.delivery_fees, public.delivery_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.delivery_fees, public.delivery_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.get_delivery_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'free_over', coalesce((SELECT (value #>> '{}')::numeric FROM public.delivery_settings WHERE key = 'free_over'), 5000),
    'default_fee', coalesce((SELECT (value #>> '{}')::numeric FROM public.delivery_settings WHERE key = 'default_fee'), 80),
    'regions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('region', region, 'fee', fee, 'sort_order', sort_order) ORDER BY sort_order, region)
      FROM public.delivery_fees
      WHERE is_active = true
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_delivery_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_delivery_config() TO anon, authenticated, service_role;

-- Dealer identity must exist before the checkout function is compiled: approved
-- accounts receive authoritative wholesale prices inside the same transaction.
-- Approval controls and RPC grants are defined in the dealer section below.
CREATE TABLE IF NOT EXISTS public.dealer_accounts (
  account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 2 AND 80),
  phone text NOT NULL CHECK (length(btrim(phone)) BETWEEN 10 AND 20),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at timestamptz
);

-- ── Inventory reservation columns and invariants ─────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_region text,
  ADD COLUMN IF NOT EXISTS inventory_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_id uuid,
  ADD COLUMN IF NOT EXISTS pricing_tier text NOT NULL DEFAULT 'retail';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pricing_tier_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_pricing_tier_check
  CHECK (pricing_tier IN ('retail', 'dealer'));

CREATE INDEX IF NOT EXISTS idx_orders_account_created
  ON public.orders (account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

ALTER TABLE public.products ALTER COLUMN stock SET DEFAULT 0;
UPDATE public.products SET stock = 0 WHERE stock IS NULL OR stock < 0;
ALTER TABLE public.products ALTER COLUMN stock SET NOT NULL;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_nonnegative;
ALTER TABLE public.products ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);

CREATE INDEX IF NOT EXISTS idx_orders_expiring_reservations
  ON public.orders (reservation_expires_at)
  WHERE status = 'Pending' AND inventory_reserved_at IS NOT NULL AND inventory_released_at IS NULL;

-- Prevent an administrator or future code path from silently changing the cart
-- underneath an active reservation. Cancelling restores inventory in the same
-- transaction even when it did not go through the release RPC.
CREATE OR REPLACE FUNCTION public.guard_order_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  line record;
BEGIN
  IF OLD.inventory_reserved_at IS NOT NULL
     AND OLD.inventory_released_at IS NULL
     AND OLD.status = 'Pending'
     AND NEW.items IS DISTINCT FROM OLD.items THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'cannot change items while inventory is reserved; cancel and recreate the order';
  END IF;

  IF OLD.status = 'Pending'
     AND NEW.status = 'Cancelled'
     AND OLD.inventory_reserved_at IS NOT NULL
     AND OLD.inventory_released_at IS NULL
     AND NEW.inventory_released_at IS NULL THEN
    FOR line IN
      SELECT item->>'product_id' AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(coalesce(OLD.items, '[]'::jsonb)) item
      WHERE item->>'product_id' IS NOT NULL AND item->>'quantity' ~ '^[1-9][0-9]*$'
      GROUP BY item->>'product_id'
      ORDER BY item->>'product_id'
    LOOP
      UPDATE public.products
      SET stock = stock + line.quantity,
          updated_at = timezone('utc', now())
      WHERE id = line.product_id;
    END LOOP;
    NEW.inventory_released_at := timezone('utc', now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_reservation ON public.orders;
CREATE TRIGGER trg_guard_order_reservation
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_reservation();

-- ── Reservation release helpers (server-only) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.release_expired_order_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target record;
  line record;
  released integer := 0;
BEGIN
  FOR target IN
    SELECT id, order_number, items
    FROM public.orders
    WHERE status = 'Pending'
      AND inventory_reserved_at IS NOT NULL
      AND inventory_released_at IS NULL
      AND reservation_expires_at <= timezone('utc', now())
    ORDER BY reservation_expires_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  LOOP
    FOR line IN
      SELECT item->>'product_id' AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(coalesce(target.items, '[]'::jsonb)) item
      WHERE item->>'product_id' IS NOT NULL AND item->>'quantity' ~ '^[1-9][0-9]*$'
      GROUP BY item->>'product_id'
      ORDER BY item->>'product_id'
    LOOP
      UPDATE public.products
      SET stock = stock + line.quantity,
          updated_at = timezone('utc', now())
      WHERE id = line.product_id;
    END LOOP;

    UPDATE public.orders
    SET status = 'Cancelled',
        inventory_released_at = timezone('utc', now()),
        admin_notes = trim(coalesce(admin_notes, '') || E'\n[Inventory] reservation expired and stock was restored'),
        updated_at = timezone('utc', now())
    WHERE id = target.id;
    released := released + 1;
  END LOOP;
  RETURN released;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_reservation(
  p_order_number text,
  p_reason text DEFAULT 'checkout_initialization_failed'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target record;
  line record;
BEGIN
  SELECT id, order_number, status, items, inventory_reserved_at, inventory_released_at
  INTO target
  FROM public.orders
  WHERE order_number = btrim(coalesce(p_order_number, ''))
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF target.status <> 'Pending' OR target.inventory_reserved_at IS NULL OR target.inventory_released_at IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'not_releasable', 'order_number', target.order_number);
  END IF;

  FOR line IN
    SELECT item->>'product_id' AS product_id,
           sum((item->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(coalesce(target.items, '[]'::jsonb)) item
    WHERE item->>'product_id' IS NOT NULL AND item->>'quantity' ~ '^[1-9][0-9]*$'
    GROUP BY item->>'product_id'
    ORDER BY item->>'product_id'
  LOOP
    UPDATE public.products
    SET stock = stock + line.quantity,
        updated_at = timezone('utc', now())
    WHERE id = line.product_id;
  END LOOP;

  UPDATE public.orders
  SET status = 'Cancelled',
      inventory_released_at = timezone('utc', now()),
      admin_notes = trim(coalesce(admin_notes, '') || E'\n[Inventory] reservation released: ' || left(coalesce(p_reason, 'unspecified'), 120)),
      updated_at = timezone('utc', now())
  WHERE id = target.id;

  RETURN jsonb_build_object('result', 'released', 'order_number', target.order_number);
END;
$$;

-- ── Canonical checkout RPC: server pricing + atomic stock reservation ────────
-- Remove the previous nine-argument implementation before introducing the
-- account-linked signature; otherwise PostgreSQL would retain it as a callable
-- overload with the older body.
DROP FUNCTION IF EXISTS public.create_pending_order(text, text, jsonb, numeric, numeric, numeric, text, text, text);
CREATE OR REPLACE FUNCTION public.create_pending_order(
  p_order_number text,
  p_customer_id text,
  p_items jsonb,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method text,
  p_idempotency_key text DEFAULT NULL,
  p_delivery_region text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item jsonb;
  product_row record;
  stock_line record;
  existing_order record;
  canonical_items jsonb := '[]'::jsonb;
  canonical_subtotal numeric := 0;
  canonical_delivery_fee numeric := 0;
  canonical_total numeric := 0;
  canonical_region text;
  fee_source text := 'default';
  free_over numeric := 5000;
  default_fee numeric := 80;
  quantity integer;
  total_quantity integer := 0;
  customer_key text;
  idem_key text;
  order_id text;
  approved_dealer boolean := false;
BEGIN
  -- Opportunistically reclaim abandoned stock. This call participates in the
  -- current transaction and is bounded to 100 reservations per checkout.
  PERFORM public.release_expired_order_reservations();

  IF p_order_number IS NULL OR length(btrim(p_order_number)) > 64
     OR btrim(p_order_number) !~ '^VG-[A-Z0-9]+-[A-Z0-9]{9}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid order_number';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'items must be a non-empty array of at most 50 entries';
  END IF;
  IF p_payment_method IS NULL OR length(btrim(p_payment_method)) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid payment_method';
  END IF;
  IF p_idempotency_key IS NOT NULL AND length(btrim(p_idempotency_key)) > 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'idempotency_key too long';
  END IF;

  SELECT id INTO customer_key
  FROM public.customers
  WHERE id = NULLIF(btrim(coalesce(p_customer_id, '')), '')
  LIMIT 1;
  IF customer_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'customer does not exist';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dealer_accounts
    WHERE account_id = p_account_id AND status = 'approved'
  ) INTO approved_dealer;

  idem_key := NULLIF(btrim(coalesce(p_idempotency_key, '')), '');
  IF idem_key IS NOT NULL THEN
    -- Serialize identical in-flight checkouts before looking for a prior row.
    -- Without this transaction-scoped lock, two concurrent first requests can
    -- both miss the SELECT and one receives a unique-index error instead of the
    -- existing order after its stock reservation is rolled back.
    PERFORM pg_advisory_xact_lock(hashtextextended(customer_key || ':' || idem_key, 0));

    SELECT id, order_number, subtotal, delivery_fee, delivery_region, total,
           pricing_tier, inventory_reserved_at, inventory_released_at, reservation_expires_at
    INTO existing_order
    FROM public.orders
    WHERE customer_id = customer_key AND idempotency_key = idem_key AND status = 'Pending'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', existing_order.id,
        'order_number', existing_order.order_number,
        'idempotent', true,
        'subtotal', existing_order.subtotal,
        'delivery_fee', existing_order.delivery_fee,
        'delivery_region', existing_order.delivery_region,
        'total', existing_order.total,
        'fee_source', 'stored',
        'pricing_tier', existing_order.pricing_tier,
        'reservation_expires_at', existing_order.reservation_expires_at
      );
    END IF;
  END IF;

  -- Rebuild each line from the catalog. Supplied unit prices and line totals are
  -- ignored, even though the compatibility signature still accepts totals.
  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(btrim(item->>'product_id'), '') IS NULL OR length(btrim(item->>'product_id')) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item needs a valid product_id';
    END IF;
    IF coalesce(item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each item needs a positive integer quantity';
    END IF;
    quantity := (item->>'quantity')::integer;
    IF quantity > 50 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'item quantity exceeds 50';
    END IF;
    total_quantity := total_quantity + quantity;
    IF total_quantity > 100 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'cart quantity exceeds 100';
    END IF;

    SELECT id, name, round(
      CASE WHEN approved_dealer AND wholesale_price > 0 THEN wholesale_price ELSE price END,
      2
    ) AS price
    INTO product_row
    FROM public.products
    WHERE id = btrim(item->>'product_id') AND is_active = true AND price > 0
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('product %s is unavailable', item->>'product_id');
    END IF;

    canonical_subtotal := canonical_subtotal + product_row.price * quantity;
    canonical_items := canonical_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id,
      'name', product_row.name,
      'quantity', quantity,
      'unit_price', product_row.price,
      'line_total', round(product_row.price * quantity, 2),
      'selected_color', left(nullif(btrim(coalesce(item->>'selected_color', '')), ''), 60),
      'selected_storage', left(nullif(btrim(coalesce(item->>'selected_storage', '')), ''), 60)
    ));
  END LOOP;
  canonical_subtotal := round(canonical_subtotal, 2);

  SELECT coalesce((value #>> '{}')::numeric, 5000) INTO free_over
  FROM public.delivery_settings WHERE key = 'free_over';
  free_over := coalesce(free_over, 5000);
  SELECT coalesce((value #>> '{}')::numeric, 80) INTO default_fee
  FROM public.delivery_settings WHERE key = 'default_fee';
  default_fee := coalesce(default_fee, 80);

  canonical_region := NULLIF(btrim(coalesce(p_delivery_region, '')), '');
  IF canonical_region IS NOT NULL THEN
    SELECT region, fee INTO canonical_region, canonical_delivery_fee
    FROM public.delivery_fees
    WHERE lower(region) = lower(canonical_region) AND is_active = true
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_delivery_region';
    END IF;
    fee_source := 'region';
  ELSE
    canonical_delivery_fee := default_fee;
  END IF;
  IF canonical_subtotal >= free_over THEN
    canonical_delivery_fee := 0;
    fee_source := 'free_over';
  END IF;
  canonical_delivery_fee := round(greatest(canonical_delivery_fee, 0), 2);
  canonical_total := round(canonical_subtotal + canonical_delivery_fee, 2);

  -- Lock product rows in deterministic order, then verify aggregate demand so
  -- duplicate cart lines cannot bypass stock checks.
  FOR stock_line IN
    SELECT item_value->>'product_id' AS product_id,
           sum((item_value->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) item_value
    GROUP BY item_value->>'product_id'
    ORDER BY item_value->>'product_id'
  LOOP
    SELECT id, stock INTO product_row
    FROM public.products
    WHERE id = stock_line.product_id
    FOR UPDATE;
    IF NOT FOUND OR product_row.stock < stock_line.quantity THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = format('insufficient_stock:%s', stock_line.product_id);
    END IF;
  END LOOP;

  FOR stock_line IN
    SELECT item_value->>'product_id' AS product_id,
           sum((item_value->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) item_value
    GROUP BY item_value->>'product_id'
    ORDER BY item_value->>'product_id'
  LOOP
    UPDATE public.products
    SET stock = stock - stock_line.quantity,
        updated_at = timezone('utc', now())
    WHERE id = stock_line.product_id;
  END LOOP;

  INSERT INTO public.orders (
    order_number, customer_id, items, subtotal, delivery_fee, delivery_region,
    total, status, payment_method, idempotency_key, account_id, pricing_tier,
    inventory_reserved_at, reservation_expires_at
  ) VALUES (
    btrim(p_order_number), customer_key, canonical_items, canonical_subtotal,
    canonical_delivery_fee, canonical_region, canonical_total, 'Pending',
    btrim(p_payment_method), idem_key, p_account_id,
    CASE WHEN approved_dealer THEN 'dealer' ELSE 'retail' END,
    timezone('utc', now()), timezone('utc', now()) + interval '30 minutes'
  ) RETURNING id INTO order_id;

  RETURN jsonb_build_object(
    'id', order_id,
    'order_number', btrim(p_order_number),
    'idempotent', false,
    'subtotal', canonical_subtotal,
    'delivery_fee', canonical_delivery_fee,
    'delivery_region', canonical_region,
    'total', canonical_total,
    'fee_source', fee_source,
    'pricing_tier', CASE WHEN approved_dealer THEN 'dealer' ELSE 'retail' END,
    'reservation_expires_at', timezone('utc', now()) + interval '30 minutes'
  );
END;
$$;

-- ── Signed-webhook payment transition (server-only) ─────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_order_paid(
  p_reference text,
  p_expected_total numeric,
  p_gateway_reference text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target record;
  stock_line record;
  product_row record;
BEGIN
  IF p_reference IS NULL OR btrim(p_reference) = '' THEN
    RETURN jsonb_build_object('result', 'invalid_reference');
  END IF;

  SELECT id, order_number, total, status, items, payment_reference,
         inventory_reserved_at, inventory_released_at
  INTO target
  FROM public.orders
  WHERE order_number = btrim(p_reference)
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF target.status = 'Paid' THEN
    RETURN jsonb_build_object('result', 'already_paid', 'order_number', target.order_number);
  END IF;
  IF target.status <> 'Pending' OR target.inventory_released_at IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'invalid_status', 'order_number', target.order_number);
  END IF;
  IF p_expected_total IS NULL OR p_expected_total::text IN ('NaN', 'Infinity', '-Infinity')
     OR round(target.total, 2) <> round(p_expected_total, 2) THEN
    RETURN jsonb_build_object('result', 'amount_mismatch', 'order_number', target.order_number, 'order_total', target.total);
  END IF;
  IF target.payment_reference IS NOT NULL
     AND (NULLIF(btrim(coalesce(p_gateway_reference, '')), '') IS NULL
          OR target.payment_reference <> btrim(p_gateway_reference)) THEN
    RETURN jsonb_build_object('result', 'gateway_reference_mismatch', 'order_number', target.order_number);
  END IF;

  -- Legacy Pending orders did not reserve stock at creation. Handle them with
  -- a conditional aggregate decrement; never clamp stock to zero.
  IF target.inventory_reserved_at IS NULL THEN
    FOR stock_line IN
      SELECT item->>'product_id' AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(coalesce(target.items, '[]'::jsonb)) item
      WHERE item->>'product_id' IS NOT NULL AND item->>'quantity' ~ '^[1-9][0-9]*$'
      GROUP BY item->>'product_id'
      ORDER BY item->>'product_id'
    LOOP
      SELECT id, stock INTO product_row FROM public.products WHERE id = stock_line.product_id FOR UPDATE;
      IF NOT FOUND OR product_row.stock < stock_line.quantity THEN
        RETURN jsonb_build_object('result', 'insufficient_stock', 'order_number', target.order_number);
      END IF;
    END LOOP;
    FOR stock_line IN
      SELECT item->>'product_id' AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(coalesce(target.items, '[]'::jsonb)) item
      WHERE item->>'product_id' IS NOT NULL AND item->>'quantity' ~ '^[1-9][0-9]*$'
      GROUP BY item->>'product_id'
      ORDER BY item->>'product_id'
    LOOP
      UPDATE public.products SET stock = stock - stock_line.quantity, updated_at = timezone('utc', now())
      WHERE id = stock_line.product_id;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'Paid',
      paid_at = coalesce(p_paid_at, timezone('utc', now())),
      payment_reference = coalesce(payment_reference, NULLIF(btrim(coalesce(p_gateway_reference, '')), '')),
      admin_notes = trim(coalesce(admin_notes, '') || E'\n[Valmont-Pay] signed charge.success verified'),
      updated_at = timezone('utc', now())
  WHERE id = target.id;

  RETURN jsonb_build_object('result', 'paid', 'order_number', target.order_number, 'order_total', target.total);
END;
$$;

-- Tighten the existing server mutation functions while keeping their API shape.
CREATE OR REPLACE FUNCTION public.set_order_payment_reference(
  p_order_number text,
  p_payment_reference text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target record;
BEGIN
  IF NULLIF(btrim(coalesce(p_payment_reference, '')), '') IS NULL
     OR length(btrim(p_payment_reference)) > 190 THEN
    RETURN jsonb_build_object('result', 'invalid_payment_reference');
  END IF;
  SELECT id, order_number, status, payment_reference INTO target
  FROM public.orders WHERE order_number = btrim(coalesce(p_order_number, '')) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF target.status <> 'Pending' THEN RETURN jsonb_build_object('result', 'invalid_status'); END IF;
  IF target.payment_reference IS NOT NULL AND target.payment_reference <> btrim(p_payment_reference) THEN
    RETURN jsonb_build_object('result', 'reference_already_set');
  END IF;
  UPDATE public.orders
  SET payment_reference = btrim(p_payment_reference),
      admin_notes = CASE WHEN NULLIF(btrim(coalesce(p_note, '')), '') IS NULL THEN admin_notes
        ELSE trim(coalesce(admin_notes, '') || E'\n[Valmont-Pay] ' || left(btrim(p_note), 300)) END,
      updated_at = timezone('utc', now())
  WHERE id = target.id;
  RETURN jsonb_build_object('result', 'ok', 'order_number', target.order_number);
END;
$$;

-- ── Server-authoritative customer reviews ───────────────────────────────────
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ALTER COLUMN is_verified_buyer SET DEFAULT false;
ALTER TABLE public.reviews ALTER COLUMN is_approved SET DEFAULT false;
UPDATE public.reviews SET is_verified_buyer = false, is_approved = false
WHERE reviewer_id IS NULL AND created_at >= timezone('utc', now()) - interval '90 days';

DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS reviews_public_insert ON public.reviews;
REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated, service_role;
GRANT UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
DO $$
BEGIN
  IF to_regclass('public.reviews_id_seq') IS NOT NULL THEN
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.reviews_id_seq TO service_role';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id text,
  p_rating integer,
  p_comment text,
  p_photo_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  user_id uuid := auth.uid();
  user_email text := lower(nullif(auth.jwt()->>'email', ''));
  review_id public.reviews.id%TYPE;
  verified boolean := false;
  reviewer_name text := COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    split_part(user_email, '@', 1),
    'Valmont customer'
  );
  safe_photo text := nullif(btrim(coalesce(p_photo_url, '')), '');
BEGIN
  IF user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid product';
  END IF;
  IF length(reviewer_name) NOT BETWEEN 2 AND 80
     OR p_rating NOT BETWEEN 1 AND 5
     OR length(btrim(coalesce(p_comment, ''))) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid review fields';
  END IF;
  IF safe_photo IS NOT NULL AND (
    length(safe_photo) > 500
    OR safe_photo !~* '^https://(images\.unsplash\.com/|eydsoqnpetqczaeqrscc\.supabase\.co/storage/v1/object/public/)'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'photo_url host is not allowed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE user_email IS NOT NULL
      AND lower(o.customer_email) = user_email
      AND o.status IN ('Paid', 'Confirmed', 'Shipped', 'Delivered')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
        WHERE item->>'product_id' = p_product_id
      )
  ) INTO verified;

  INSERT INTO public.reviews (
    product_id, customer_name, customer_email, rating, comment, photo_url,
    is_verified_buyer, is_approved, reviewer_id
  ) VALUES (
    p_product_id, reviewer_name, user_email, p_rating, btrim(p_comment),
    safe_photo, verified, false, user_id
  ) RETURNING id INTO review_id;

  RETURN jsonb_build_object('id', review_id, 'is_verified_buyer', verified, 'is_approved', false, 'result', 'pending_moderation');
END;
$$;

-- ── Server-authoritative Daily Drop ─────────────────────────────────────────
DROP INDEX IF EXISTS public.drop_flips_phone_day;
DROP POLICY IF EXISTS drop_flips_public_insert ON public.drop_flips;
REVOKE INSERT, DELETE ON public.drop_flips FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.drop_flips TO authenticated;
GRANT ALL ON public.drop_flips TO service_role;

CREATE OR REPLACE FUNCTION public.claim_daily_drop(
  p_whatsapp text,
  p_device_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  user_id uuid := auth.uid();
  user_email text := lower(nullif(auth.jwt()->>'email', ''));
  drop_day date := (timezone('Africa/Accra', now()) - interval '6 hours')::date;
  random_value numeric;
  tier text;
  label text;
  code text;
  product_row record;
  flip_row record;
BEGIN
  IF user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication required'; END IF;
  IF p_whatsapp IS NULL OR p_whatsapp !~ '^0(20|23|24|25|26|27|28|50|53|54|55|56|57|59)[0-9]{7}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid Ghana mobile number';
  END IF;

  SELECT * INTO flip_row FROM public.drop_flips
  WHERE account_id = user_id AND drop_date = drop_day
  LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN to_jsonb(flip_row); END IF;

  random_value := (get_byte(gen_random_bytes(2), 0) * 256 + get_byte(gen_random_bytes(2), 1))::numeric / 65535;
  IF random_value < 0.01 AND NOT EXISTS (
    SELECT 1 FROM public.drop_flips WHERE drop_date = drop_day AND prize_tier = 'golden'
  ) THEN
    tier := 'golden'; label := 'GOLDEN CARD — 30% OFF one unit'; code := 'GOLDEN30';
  ELSIF random_value < 0.15 THEN
    tier := 'good';
    IF random_value < 0.06 THEN label := 'GH₵150 off your next purchase'; code := 'DROPCR150';
    ELSIF random_value < 0.11 THEN label := '20% OFF any accessory'; code := 'DROPACC20';
    ELSE label := '10% OFF any laptop'; code := 'DROPLAP10'; END IF;
  ELSE
    tier := 'common';
    CASE floor(random_value * 5)::integer % 5
      WHEN 0 THEN label := 'Free Accra delivery'; code := 'DROPFREE';
      WHEN 1 THEN label := '50% OFF any phone case'; code := 'DROPCASE50';
      WHEN 2 THEN label := '50% OFF screen protector + free fitting'; code := 'DROPSCRN50';
      WHEN 3 THEN label := 'Free 32GB memory card'; code := 'DROPSD32';
      ELSE label := '5% OFF any phone or laptop'; code := 'DROP5';
    END CASE;
  END IF;

  SELECT id, name INTO product_row
  FROM public.products WHERE is_active = true AND stock > 0
  ORDER BY random() LIMIT 1;

  INSERT INTO public.drop_flips (
    drop_date, device_id, account_id, account_email, whatsapp,
    prize_tier, prize_label, prize_code, product_id, product_name
  ) VALUES (
    drop_day, left(coalesce(nullif(btrim(p_device_id), ''), 'acct:' || user_id::text), 160),
    user_id, user_email, p_whatsapp, tier, label, code, product_row.id, product_row.name
  ) RETURNING * INTO flip_row;

  RETURN to_jsonb(flip_row);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO flip_row FROM public.drop_flips
  WHERE account_id = user_id AND drop_date = drop_day LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(flip_row); END IF;
  RAISE;
END;
$$;

-- ── Authoritative dealer approval ───────────────────────────────────────────
-- Shopper-controlled auth metadata must never unlock wholesale pricing. Dealer
-- state lives in the table created before the checkout function. Its status can
-- be approved only through the existing admin RLS boundary or by service_role.
ALTER TABLE public.dealer_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dealer_accounts_self_select ON public.dealer_accounts;
CREATE POLICY dealer_accounts_self_select ON public.dealer_accounts
  FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR public.is_valmont_admin());
DROP POLICY IF EXISTS dealer_accounts_admin_update ON public.dealer_accounts;
CREATE POLICY dealer_accounts_admin_update ON public.dealer_accounts
  FOR UPDATE TO authenticated
  USING (public.is_valmont_admin())
  WITH CHECK (public.is_valmont_admin());
REVOKE INSERT, DELETE ON public.dealer_accounts FROM anon, authenticated;
GRANT SELECT ON public.dealer_accounts TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.dealer_accounts TO service_role;
GRANT UPDATE ON public.dealer_accounts TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_for_dealer(p_business_name text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  user_id uuid := auth.uid();
  user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  dealer public.dealer_accounts%ROWTYPE;
BEGIN
  IF user_id IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  IF btrim(coalesce(p_business_name, '')) !~ '^[[:alpha:]][[:alpha:] .&''-]{1,79}$' THEN
    RAISE EXCEPTION 'invalid business name' USING ERRCODE = '22023';
  END IF;
  IF btrim(coalesce(p_phone, '')) !~ '^([+]233[0-9]{9}|0[0-9]{9})$' THEN
    RAISE EXCEPTION 'invalid Ghana phone number' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dealer_accounts (account_id, business_name, phone, email)
  VALUES (user_id, btrim(p_business_name), btrim(p_phone), user_email)
  ON CONFLICT (account_id) DO UPDATE
    SET business_name = EXCLUDED.business_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        updated_at = timezone('utc', now())
    -- Reapplications cannot overwrite an admin decision or grant approval.
    WHERE public.dealer_accounts.status IN ('pending', 'rejected')
  RETURNING * INTO dealer;

  IF NOT FOUND THEN
    SELECT * INTO dealer FROM public.dealer_accounts WHERE account_id = user_id;
  END IF;
  RETURN jsonb_build_object('status', dealer.status, 'business_name', dealer.business_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_dealer_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  user_id uuid := auth.uid();
  dealer public.dealer_accounts%ROWTYPE;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO dealer FROM public.dealer_accounts WHERE account_id = user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'business_name', dealer.business_name,
    'phone', dealer.phone,
    'email', dealer.email,
    'status', dealer.status
  );
END;
$$;

-- ── Catalog confidentiality boundary ────────────────────────────────────────
-- A SELECT policy cannot hide individual columns. Public/authenticated catalog
-- reads therefore use a reviewed projection, while direct products access is
-- restricted to the allowlisted admin. Supplier wholesale prices are returned
-- only to a currently approved dealer account.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
DROP POLICY IF EXISTS "Authenticated full access products" ON public.products;
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_valmont_admin())
  WITH CHECK (public.is_valmont_admin());
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT ON public.products TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_storefront_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'slug', p.slug,
    'category_id', p.category_id,
    'price', p.price,
    'compare_at_price', p.compare_at_price,
    'specs', p.specs,
    'description', p.description,
    'badge', p.badge,
    'stock', p.stock,
    'image_url', p.image_url,
    'images', p.images,
    'colors', p.colors,
    'storage_options', p.storage_options
  ) ORDER BY p.created_at DESC, p.id), '[]'::jsonb)
  FROM public.products p
  WHERE p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_my_dealer_prices()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  user_id uuid := auth.uid();
  result jsonb;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dealer_accounts
    WHERE account_id = user_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'approved dealer account required' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_id', p.id,
    'wholesale_price', round(p.wholesale_price, 2)
  ) ORDER BY p.id), '[]'::jsonb)
  INTO result
  FROM public.products p
  WHERE p.is_active = true AND p.wholesale_price > 0;
  RETURN result;
END;
$$;

-- ── Account-bound order history ─────────────────────────────────────────────
-- Returns only the calling account's orders and exposes no administrative notes,
-- customer IDs, payment references, or other shoppers' contact details.
CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  user_id uuid := auth.uid();
  result jsonb;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'items', coalesce(o.items, '[]'::jsonb),
        'subtotal', o.subtotal,
        'delivery_fee', o.delivery_fee,
        'total_amount', o.total,
        'status', o.status,
        'payment_method', o.payment_method,
        'delivery_region', o.delivery_region,
        'delivery_address', o.delivery_address,
        'created_at', o.created_at,
        'updated_at', o.updated_at
      ) ORDER BY o.created_at DESC
    ),
    '[]'::jsonb
  ) INTO result
  FROM public.orders o
  WHERE o.account_id = user_id;

  RETURN result;
END;
$$;

-- ── Privilege boundary regression lock ──────────────────────────────────────
-- Remove all public/authenticated execution from every overload of the listed
-- mutation functions, including legacy signatures left by older migrations.
DO $$
DECLARE
  proc regprocedure;
BEGIN
  FOR proc IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'create_pending_order', 'confirm_order_paid', 'set_order_payment_reference',
      'set_order_customer_snapshot', 'ensure_customer_for_checkout',
      'release_order_reservation', 'release_expired_order_reservations'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', proc);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_order(text,text,jsonb,numeric,numeric,numeric,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_order_paid(text,numeric,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_order_payment_reference(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_order_customer_snapshot(text,text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_customer_for_checkout(text,text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_reservation(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_order_reservations() TO service_role;
REVOKE ALL ON FUNCTION public.submit_product_review(text,integer,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_daily_drop(text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_for_dealer(text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_dealer_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_dealer_prices() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_storefront_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storefront_catalog() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_product_review(text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_drop(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_for_dealer(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_dealer_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_dealer_prices() TO authenticated;

-- Public writes now enter through rate-limited/server-authoritative boundaries.
DROP POLICY IF EXISTS sms_leads_public_insert ON public.sms_leads;
REVOKE INSERT, UPDATE, DELETE ON public.sms_leads FROM anon;
GRANT ALL ON public.sms_leads TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sms_leads_id_seq TO service_role;

-- Customers and orders never need shopper mutation privileges. Authenticated
-- table grants remain for the allowlisted admin and are constrained by RLS.
DROP POLICY IF EXISTS "Anon can create customers" ON public.customers;
REVOKE INSERT, UPDATE, DELETE ON public.customers, public.orders FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.customers, public.orders TO authenticated, service_role;

-- Assertions fail deployment rather than silently reintroducing the payment bypass.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
      AND routine_name IN ('create_pending_order', 'confirm_order_paid', 'set_order_payment_reference',
                           'set_order_customer_snapshot', 'ensure_customer_for_checkout')
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
      AND privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'security regression: a checkout mutation RPC remains publicly executable';
  END IF;
END;
$$;
