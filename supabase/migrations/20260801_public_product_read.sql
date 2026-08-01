-- ==============================================================================
-- Allow the storefront (anon role) to read active products and categories.
-- Safe to run multiple times.
-- ==============================================================================

-- Enable RLS on products (idempotent)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read: active products only
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
  ON public.products FOR SELECT
  TO anon
  USING (is_active = true);

-- Public read: all categories (needed for storefront nav)
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT
  TO anon
  USING (true);
