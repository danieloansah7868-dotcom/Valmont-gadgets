CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery ON orders(estimated_delivery_date);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);

INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('iphones', 'iPhones and Apple', 'iphones', 1),
  ('samsung', 'Samsung Galaxy', 'samsung', 2),
  ('laptops', 'Executive Laptops', 'laptops', 3),
  ('audio', 'Smart Audio', 'audio', 4),
  ('power', 'Power and Chargers', 'power', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products" ON public.products FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated full access products" ON public.products;
CREATE POLICY "Authenticated full access products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated full access categories" ON public.categories;
CREATE POLICY "Authenticated full access categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can create orders" ON public.orders;
CREATE POLICY "Anon can create orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access orders" ON public.orders;
CREATE POLICY "Authenticated full access orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can create customers" ON public.customers;
CREATE POLICY "Anon can create customers" ON public.customers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access customers" ON public.customers;
CREATE POLICY "Authenticated full access customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings" ON public.site_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated full access settings" ON public.site_settings;
CREATE POLICY "Authenticated full access settings" ON public.site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
CREATE POLICY "Allow public read approved reviews" ON public.reviews FOR SELECT TO anon USING (is_approved = true);

DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access reviews" ON public.reviews;
CREATE POLICY "Authenticated full access reviews" ON public.reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public product image reads" ON storage.objects;
CREATE POLICY "Public product image reads" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin product image uploads" ON storage.objects;
CREATE POLICY "Admin product image uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin product image updates" ON storage.objects;
CREATE POLICY "Admin product image updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin product image deletes" ON storage.objects;
CREATE POLICY "Admin product image deletes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');
