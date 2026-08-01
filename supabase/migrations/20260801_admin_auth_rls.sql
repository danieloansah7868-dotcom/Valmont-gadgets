-- ==============================================================================
-- Supabase Auth + RLS: Admin Write Access
-- Run this in Supabase SQL Editor AFTER creating the admin user.
--
-- STEP 1 (Dashboard): Authentication → Users → "Add user" → "Create new user"
--   Email:    admin@valmontgadgets.com
--   Password: (pick a strong one — at least 8 chars)
--   Tick "Auto Confirm User"
--
-- STEP 2: Run this SQL to lock down writes to authenticated users only.
-- ==============================================================================

-- Ensure RLS is on for all admin-managed tables
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews        ENABLE ROW LEVEL SECURITY;

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
  ON public.products FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated full access products" ON public.products;
CREATE POLICY "Authenticated full access products"
  ON public.products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── CATEGORIES ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated full access categories" ON public.categories;
CREATE POLICY "Authenticated full access categories"
  ON public.categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── ORDERS ────────────────────────────────────────────────────────────────────
-- Anon can INSERT orders (checkout) and read their own
DROP POLICY IF EXISTS "Anon can create orders" ON public.orders;
CREATE POLICY "Anon can create orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access orders" ON public.orders;
CREATE POLICY "Authenticated full access orders"
  ON public.orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── CUSTOMERS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anon can create customers" ON public.customers;
CREATE POLICY "Anon can create customers"
  ON public.customers FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access customers" ON public.customers;
CREATE POLICY "Authenticated full access customers"
  ON public.customers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── SITE SETTINGS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings"
  ON public.site_settings FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated full access settings" ON public.site_settings;
CREATE POLICY "Authenticated full access settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── REVIEWS (already has policies from 20260731, add admin access) ────────────
DROP POLICY IF EXISTS "Authenticated full access reviews" ON public.reviews;
CREATE POLICY "Authenticated full access reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── STORAGE: product-images bucket ────────────────────────────────────────────
-- Public read (storefront needs to display images)
DROP POLICY IF EXISTS "Public product image reads" ON storage.objects;
CREATE POLICY "Public product image reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Only authenticated admin can upload/update/delete images
DROP POLICY IF EXISTS "Admin product image uploads" ON storage.objects;
CREATE POLICY "Admin product image uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin product image updates" ON storage.objects;
CREATE POLICY "Admin product image updates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin product image deletes" ON storage.objects;
CREATE POLICY "Admin product image deletes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
