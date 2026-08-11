-- =============================================================================
-- Valmont Gadgets — reliable customer records for admin customers/orders
--
-- Problem: checkout created the order through create_pending_order() while the
-- customers row was written separately through PostgREST. That best-effort POST
-- could be blocked by RLS, a duplicate, or a transient failure without stopping
-- checkout; orders then had only a customer_id and admin normalized those rows
-- to the generic name "Customer" with blank phone/email/address.
--
-- Fix:
--   1. Snapshot checkout contact details directly on orders.
--   2. Upsert customers through a narrow SECURITY DEFINER RPC so the foreign key
--      and the admin customer list are always populated.
--   3. Backfill existing order snapshots from joined customer rows.
-- Safe to re-run.
-- =============================================================================

-- ── 1. Snapshot columns on orders ───────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_area TEXT,
  ADD COLUMN IF NOT EXISTS customer_street TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON public.orders (customer_phone);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email
  ON public.orders (customer_email);

-- ── 2. Customer upsert RPC used by checkout ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_customer_for_checkout(
  p_customer_id    text,
  p_name           text,
  p_phone          text,
  p_email          text,
  p_area           text,
  p_street         text,
  p_full_address   text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id text;
  v_name        text;
  v_phone       text;
  v_email       text;
  v_area        text;
  v_street      text;
  v_full        text;
  v_addresses   jsonb;
BEGIN
  v_customer_id := NULLIF(btrim(p_customer_id), '');
  v_name        := NULLIF(btrim(coalesce(p_name, '')), '');
  v_phone       := NULLIF(btrim(coalesce(p_phone, '')), '');
  v_email       := lower(NULLIF(btrim(coalesce(p_email, '')), ''));
  v_area        := NULLIF(btrim(coalesce(p_area, '')), '');
  v_street      := NULLIF(btrim(coalesce(p_street, '')), '');
  v_full        := NULLIF(btrim(coalesce(p_full_address, '')), '');

  IF v_customer_id IS NULL OR length(v_customer_id) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid customer_id';
  END IF;

  v_addresses := CASE
    WHEN v_area IS NOT NULL OR v_street IS NOT NULL OR v_full IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object(
      'zone', v_area,
      'street', v_street,
      'address', v_full
    ))
    ELSE '[]'::jsonb
  END;

  INSERT INTO public.customers AS c (
    id, name, phone, email, addresses, created_at, updated_at
  ) VALUES (
    v_customer_id,
    coalesce(v_name, 'Customer'),
    v_phone,
    v_email,
    v_addresses,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    name = CASE WHEN c.name IS NULL OR btrim(c.name) = '' OR c.name = 'Customer'
                THEN excluded.name ELSE c.name END,
    phone = coalesce(c.phone, excluded.phone),
    email = CASE
      WHEN c.email IS NULL OR btrim(c.email) = '' OR lower(c.email) = 'sales@valmontgadgets.com'
      THEN excluded.email
      ELSE c.email
    END,
    addresses = CASE
      WHEN c.addresses IS NULL OR jsonb_typeof(c.addresses) <> 'array' OR jsonb_array_length(c.addresses) = 0
      THEN excluded.addresses
      ELSE c.addresses
    END,
    updated_at = timezone('utc'::text, now());

  RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_customer_for_checkout(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_customer_for_checkout(text, text, text, text, text, text, text)
  TO anon, authenticated, service_role;

-- ── 3. Snapshot setter used after the pending order exists ──────────────────
CREATE OR REPLACE FUNCTION public.set_order_customer_snapshot(
  p_order_number     text,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_email   text,
  p_customer_area    text,
  p_customer_street  text,
  p_delivery_address text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.orders
  SET
    customer_name = NULLIF(btrim(coalesce(p_customer_name, '')), ''),
    customer_phone = NULLIF(btrim(coalesce(p_customer_phone, '')), ''),
    customer_email = lower(NULLIF(btrim(coalesce(p_customer_email, '')), '')),
    customer_area = NULLIF(btrim(coalesce(p_customer_area, '')), ''),
    customer_street = NULLIF(btrim(coalesce(p_customer_street, '')), ''),
    delivery_address = NULLIF(btrim(coalesce(p_delivery_address, '')), ''),
    updated_at = timezone('utc'::text, now())
  WHERE order_number = btrim(p_order_number);
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_customer_snapshot(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_order_customer_snapshot(text, text, text, text, text, text, text)
  TO anon, authenticated, service_role;

-- ── 4. Backfill existing orders from customers table ────────────────────────
UPDATE public.orders AS o
SET
  customer_name = coalesce(o.customer_name, c.name),
  customer_phone = coalesce(o.customer_phone, c.phone),
  customer_email = CASE
    WHEN o.customer_email IS NOT NULL AND btrim(o.customer_email) <> '' AND lower(o.customer_email) <> 'sales@valmontgadgets.com'
    THEN o.customer_email
    ELSE CASE
      WHEN c.email IS NOT NULL AND btrim(c.email) <> '' AND lower(c.email) <> 'sales@valmontgadgets.com'
      THEN lower(c.email)
      ELSE o.customer_email
    END
  END,
  customer_area = coalesce(o.customer_area, nullif(c.addresses->0->>'zone', '')),
  customer_street = coalesce(o.customer_street, nullif(c.addresses->0->>'street', '')),
  delivery_address = coalesce(nullif(o.delivery_address, ''), nullif(c.addresses->0->>'address', ''))
FROM public.customers AS c
WHERE o.customer_id IS NOT NULL
  AND c.id = o.customer_id
  AND (
    o.customer_name IS NULL OR o.customer_phone IS NULL OR o.customer_email IS NULL
    OR o.customer_area IS NULL OR o.customer_street IS NULL OR o.delivery_address IS NULL
  );
