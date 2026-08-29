-- ═══════════════════════════════════════════════════════════════
-- Valmont Gadgets — Swap, Used, Wholesale, Partner, Admin Tables
-- Migration: 20260828_platform_tables.sql
-- ═══════════════════════════════════════════════════════════════

-- ── SELLERS / USERS (swap & wholesale) ──
CREATE TABLE IF NOT EXISTS sellers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    city TEXT,
    ghana_card TEXT,
    face_photo_url TEXT,
    face_verified BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    role TEXT DEFAULT 'seller' CHECK (role IN ('seller', 'dealer', 'wholesale', 'admin')),
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── SWAP LISTINGS ──
CREATE TABLE IF NOT EXISTS swap_listings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    seller_id TEXT REFERENCES sellers(id) ON DELETE CASCADE,
    seller_name TEXT NOT NULL,
    seller_phone TEXT NOT NULL,
    seller_verified BOOLEAN DEFAULT false,
    listing_type TEXT DEFAULT 'swap' CHECK (listing_type IN ('swap', 'sell', 'both')),
    category TEXT DEFAULT 'phones',
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    storage TEXT,
    color TEXT,
    grade TEXT CHECK (grade IN ('A', 'B', 'C')),
    battery_health INTEGER,
    screen_condition TEXT,
    body_condition TEXT,
    included TEXT,
    want TEXT,
    price NUMERIC,
    budget_min NUMERIC,
    budget_max NUMERIC,
    notes TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    city TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sold', 'removed', 'rejected')),
    is_promoted BOOLEAN DEFAULT false,
    promo_expires_at TIMESTAMPTZ,
    views INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── SWAP LEADS ──
CREATE TABLE IF NOT EXISTS swap_leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    listing_id TEXT REFERENCES swap_listings(id) ON DELETE CASCADE,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── UK/US USED INVENTORY ──
CREATE TABLE IF NOT EXISTS used_inventory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    origin TEXT NOT NULL CHECK (origin IN ('uk', 'us')),
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    storage TEXT,
    color TEXT,
    grade TEXT CHECK (grade IN ('A', 'B', 'C')),
    battery_health INTEGER,
    price NUMERIC NOT NULL,
    was_price NUMERIC,
    screen_condition TEXT,
    body_condition TEXT,
    charger_included TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    is_sold BOOLEAN DEFAULT false,
    listed_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── WHOLESALE DEALERS ──
CREATE TABLE IF NOT EXISTS wholesale_dealers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    seller_id TEXT REFERENCES sellers(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    ghana_card TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── WHOLESALE ORDERS ──
CREATE TABLE IF NOT EXISTS wholesale_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT UNIQUE NOT NULL,
    dealer_id TEXT REFERENCES wholesale_dealers(id) ON DELETE SET NULL,
    dealer_name TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC NOT NULL DEFAULT 0,
    delivery_address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── PARTNER APPLICATIONS ──
CREATE TABLE IF NOT EXISTS partner_applications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT NOT NULL,
    ghana_card TEXT NOT NULL,
    plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    monthly_volume TEXT,
    about TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── AD PAYMENTS ──
CREATE TABLE IF NOT EXISTS ad_payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    listing_id TEXT REFERENCES swap_listings(id) ON DELETE SET NULL,
    seller_id TEXT REFERENCES sellers(id) ON DELETE SET NULL,
    seller_name TEXT NOT NULL,
    plan_hours INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── ADMIN AUDIT LOG ──
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── SITE SETTINGS (extended) ──
INSERT INTO site_settings (key, value) VALUES
    ('swap_enabled', 'true'::jsonb),
    ('used_enabled', 'true'::jsonb),
    ('wholesale_enabled', 'true'::jsonb),
    ('partner_enabled', 'true'::jsonb),
    ('ad_pricing', '{"24h": 15, "3d": 35, "7d": 60, "30d": 150}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_swap_listings_status ON swap_listings(status);
CREATE INDEX IF NOT EXISTS idx_swap_listings_seller ON swap_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_swap_listings_promoted ON swap_listings(is_promoted, status);
CREATE INDEX IF NOT EXISTS idx_swap_leads_listing ON swap_leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_used_inventory_origin ON used_inventory(origin, is_sold);
CREATE INDEX IF NOT EXISTS idx_used_inventory_brand ON used_inventory(brand);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_dealer ON wholesale_orders(dealer_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_ad_payments_seller ON ad_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_sellers_phone ON sellers(phone);
CREATE INDEX IF NOT EXISTS idx_sellers_ghana_card ON sellers(ghana_card);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Public read for active listings
CREATE POLICY "Public can read active swap listings" ON swap_listings
    FOR SELECT USING (status = 'active');

-- Public read for available used inventory
CREATE POLICY "Public can read available used inventory" ON used_inventory
    FOR SELECT USING (is_sold = false);

-- Sellers can read/write their own data
CREATE POLICY "Sellers can manage own data" ON sellers
    FOR ALL USING (auth.uid()::text = id);

-- Sellers can manage own listings
CREATE POLICY "Sellers can manage own listings" ON swap_listings
    FOR ALL USING (auth.uid()::text = seller_id);

-- Admin can do everything (via admin_allowlist)
CREATE POLICY "Admin full access on sellers" ON sellers FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on swap_listings" ON swap_listings FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on swap_leads" ON swap_leads FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on used_inventory" ON used_inventory FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on wholesale_dealers" ON wholesale_dealers FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on wholesale_orders" ON wholesale_orders FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on partner_applications" ON partner_applications FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on ad_payments" ON ad_payments FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
CREATE POLICY "Admin full access on admin_audit_log" ON admin_audit_log FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_allowlist WHERE email = auth.email())
);
