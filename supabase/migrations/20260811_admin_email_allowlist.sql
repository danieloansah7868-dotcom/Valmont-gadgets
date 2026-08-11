-- ==============================================================================
-- Valmont Gadgets — Restrict the admin panel to danieloansah7868@gmail.com only
--
-- WHY THIS EXISTS
-- ---------------
-- Every admin table previously used a blanket policy of the shape
--
--     CREATE POLICY ... FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- The storefront lets ANY shopper self-register through the SAME Supabase
-- project (assets/js/account.js -> POST /auth/v1/signup, and Google OAuth).
-- A self-registered shopper therefore holds the `authenticated` role, which
-- means those policies granted every customer full read/write access to
-- orders, customers, products, site_settings, reviews and sms_leads.
--
-- This migration replaces "is logged in" with "is THE admin", enforced in the
-- database so it cannot be bypassed by calling PostgREST directly (the anon
-- key and every table name are public in app.js / shop.min.js).
--
-- Safe to run multiple times.
-- ==============================================================================

-- ── 1. Single source of truth for "who is the admin" ─────────────────────────
-- Kept as a table so the owner can add/remove staff later without a code
-- deploy. Seeded with exactly one address, per the requirement.
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
    email       TEXT PRIMARY KEY,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.admin_allowlist (email, note)
VALUES ('danieloansah7868@gmail.com', 'Owner — sole admin')
ON CONFLICT (email) DO NOTHING;

-- The allowlist itself must never be readable or writable from the browser;
-- only the SECURITY DEFINER helper below (and service_role) may consult it.
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_allowlist FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_allowlist TO service_role;

-- ── 2. is_valmont_admin(): the predicate every admin policy uses ─────────────
-- SECURITY DEFINER so it can read admin_allowlist even though the caller
-- cannot. STABLE so Postgres may cache it per statement.
CREATE OR REPLACE FUNCTION public.is_valmont_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    -- Trusted server-side contexts (webhooks, migrations, cron) stay allowed.
    coalesce(auth.role(), '') = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.admin_allowlist a
      WHERE a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        -- Only a verified email may administer the store, so an attacker
        -- cannot self-register the owner's address and inherit access
        -- before confirming it.
        AND coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, true)
    );
$$;

REVOKE ALL ON FUNCTION public.is_valmont_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valmont_admin() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_valmont_admin() IS
  'True only for the allowlisted Valmont admin email (or service_role). Used by every admin RLS policy.';

-- ── 3. PRODUCTS ──────────────────────────────────────────────────────────────
-- Shoppers (anon AND signed-in customers, e.g. drop.html) keep read access to
-- active products; only the admin may write.
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_valmont_admin());

DROP POLICY IF EXISTS "Authenticated full access products" ON public.products;
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 4. CATEGORIES ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated full access categories" ON public.categories;
DROP POLICY IF EXISTS "Admin full access categories" ON public.categories;
CREATE POLICY "Admin full access categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 5. ORDERS ────────────────────────────────────────────────────────────────
-- Checkout still writes through the SECURITY DEFINER create_pending_order()
-- RPC, so revoking direct table access from customers changes nothing for
-- shoppers — but it stops a signed-in customer reading the whole order book.
DROP POLICY IF EXISTS "Authenticated full access orders" ON public.orders;
DROP POLICY IF EXISTS "Admin full access orders" ON public.orders;
CREATE POLICY "Admin full access orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 6. CUSTOMERS ─────────────────────────────────────────────────────────────
-- Anon INSERT during checkout is preserved (existing behaviour); reading the
-- customer list is now admin-only.
DROP POLICY IF EXISTS "Anon can create customers" ON public.customers;
CREATE POLICY "Anon can create customers"
  ON public.customers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access customers" ON public.customers;
DROP POLICY IF EXISTS "Admin full access customers" ON public.customers;
CREATE POLICY "Admin full access customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 7. SITE SETTINGS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated full access settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admin full access settings" ON public.site_settings;
CREATE POLICY "Admin full access settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 8. REVIEWS ───────────────────────────────────────────────────────────────
-- Signed-in shoppers may still read approved reviews and leave one.
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
CREATE POLICY "Allow public read approved reviews"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (is_approved = true OR public.is_valmont_admin());

DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
CREATE POLICY "Allow public insert reviews"
  ON public.reviews FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admin full access reviews" ON public.reviews;
CREATE POLICY "Admin full access reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 9. SMS LEADS ─────────────────────────────────────────────────────────────
-- Collected marketing phone numbers: admin-only reads.
DROP POLICY IF EXISTS sms_leads_admin_select ON public.sms_leads;
CREATE POLICY sms_leads_admin_select ON public.sms_leads
  FOR SELECT TO authenticated
  USING (public.is_valmont_admin());

DROP POLICY IF EXISTS sms_leads_admin_update ON public.sms_leads;
CREATE POLICY sms_leads_admin_update ON public.sms_leads
  FOR UPDATE TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS sms_leads_admin_delete ON public.sms_leads;
CREATE POLICY sms_leads_admin_delete ON public.sms_leads
  FOR DELETE TO authenticated
  USING (public.is_valmont_admin());

-- ── 10. DAILY DROP FLIPS ─────────────────────────────────────────────────────
-- drop.html lets a signed-in shopper read back THEIR OWN flip. Previously any
-- authenticated user could read every captured WhatsApp lead; now a customer
-- sees only their own row and the admin sees all.
DROP POLICY IF EXISTS drop_flips_admin_read ON public.drop_flips;
CREATE POLICY drop_flips_admin_read ON public.drop_flips
  FOR SELECT TO authenticated
  USING (public.is_valmont_admin() OR account_id = auth.uid());

DROP POLICY IF EXISTS drop_flips_admin_update ON public.drop_flips;
CREATE POLICY drop_flips_admin_update ON public.drop_flips
  FOR UPDATE TO authenticated
  USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

-- ── 11. Optional admin-only tables (created outside this repo's migrations) ──
-- admin.js also reads delivery_fees / delivery_settings / admin_audit_log /
-- customer_addresses / order_items. They are locked down here only if they
-- exist, so this migration stays runnable on any environment.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'delivery_fees', 'delivery_settings', 'admin_audit_log',
    'customer_addresses', 'order_items'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
        'USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin())',
        t || '_admin_all', t
      );
    END IF;
  END LOOP;
END $$;

-- Delivery fees must stay publicly readable: the storefront prices delivery
-- from them before the shopper signs in.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'delivery_fees'
  ) THEN
    DROP POLICY IF EXISTS delivery_fees_public_read ON public.delivery_fees;
    CREATE POLICY delivery_fees_public_read ON public.delivery_fees
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- ── 12. STORAGE: product images ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin product image uploads" ON storage.objects;
CREATE POLICY "Admin product image uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin product image updates" ON storage.objects;
CREATE POLICY "Admin product image updates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_valmont_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin product image deletes" ON storage.objects;
CREATE POLICY "Admin product image deletes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_valmont_admin());

-- ── 13. Post-conditions ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE email = 'danieloansah7868@gmail.com'
  ) THEN
    RAISE EXCEPTION 'admin allowlist is missing the owner address';
  END IF;

  -- No admin-managed table may still carry a blanket USING(true) policy for
  -- the authenticated role, which is exactly the hole this migration closes.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('orders', 'customers', 'sms_leads')
      AND 'authenticated' = ANY (roles)
      AND cmd IN ('ALL', 'SELECT')
      AND coalesce(qual, '') = 'true'
  ) THEN
    RAISE EXCEPTION 'a blanket authenticated policy still grants admin data access';
  END IF;
END $$;
