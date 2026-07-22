-- Supabase Database Schema for Valmont Gadgets admin/storefront
-- Matches the admin panel tables requested for products, categories, orders,
-- customers, reviews and site_settings. IDs are TEXT so seeded/static products
-- and slug-like categories can coexist with UUID strings from the admin.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    compare_at_price NUMERIC DEFAULT 0,
    wholesale_price NUMERIC DEFAULT 0,
    specs TEXT,
    description TEXT,
    badge TEXT,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    storage_options JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_method TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Compatibility additions for deployments that already had the older schema.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);

-- Default categories
INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('iphones', 'iPhones and Apple', 'iphones', 1),
  ('samsung', 'Samsung Galaxy', 'samsung', 2),
  ('laptops', 'Executive Laptops', 'laptops', 3),
  ('audio', 'Smart Audio', 'audio', 4),
  ('power', 'Power and Chargers', 'power', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order;

-- Storage bucket used by the admin panel for product images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read/upload access for product images used by the static admin panel.
-- In production, restrict INSERT/UPDATE with Supabase Auth if a private admin
-- account is added later.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public product image reads'
  ) THEN
    CREATE POLICY "Public product image reads"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin product image uploads'
  ) THEN
    CREATE POLICY "Admin product image uploads"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;
