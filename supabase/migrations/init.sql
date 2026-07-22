-- Supabase Database Schema for Valmont Gadgets
-- Date: 2026-07-22

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- iphones, samsung, laptops, audio, power
    price NUMERIC NOT NULL,
    wholesale_price NUMERIC, -- PRIVATE, never shown to customers
    compare_at_price NUMERIC, -- original price before discount
    specs TEXT, -- short spec line
    description TEXT, -- full description
    badge TEXT, -- HOT, SEALED, DEAL, BESTSELLER, none
    rating NUMERIC DEFAULT 4.8,
    reviews_count INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT, -- main product image URL from Supabase storage
    images JSONB DEFAULT '[]'::jsonb, -- array of additional image URLs
    colors JSONB DEFAULT '[]'::jsonb, -- array of color options [{name, hex, available}]
    storage_options JSONB DEFAULT '[]'::jsonb, -- array of storage sizes [{size, price_adjustment}]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Orders Table (For syncing customer checkout details)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_area TEXT NOT NULL,
    customer_street TEXT,
    payment_method TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    items JSONB DEFAULT '[]'::jsonb, -- array of items [{id, name, qty, price, selected_color, selected_storage}]
    status TEXT DEFAULT 'Pending' NOT NULL, -- Pending, Processing, Dispatched, Delivered, Cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching and sorting
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_orders_reference_code ON orders(reference_code);

-- Storage bucket setup guidelines (to be executed via Supabase UI or API):
-- Create bucket "product-images" and enable public read access.
