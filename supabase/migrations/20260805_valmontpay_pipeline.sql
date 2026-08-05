-- =============================================================================
-- Valmont Gadgets — Valmont-Pay tenant pipeline (gateway: https://valmontpay.app)
--
-- 1. Adds `orders.payment_reference` so the gateway's VP-… reference can be
--    stored on the order next to our own order_number.
-- 2. Seeds the storefront catalog into `products` (insert-if-missing ONLY —
--    existing rows are never touched) so checkout can recompute every price
--    server-side from the database. The /api/valmontpay/initialize function
--    refuses to trust client-sent amounts.
-- 3. Adds two SECURITY DEFINER RPCs so the serverless payment endpoints can
--    run with the public anon key (no service-role secret required):
--      * confirm_order_paid(reference, expected_total) — the ONLY path an
--        anon caller has to move an order to 'Paid'. Verifies the pesewa
--        total matches before transitioning; idempotent.
--      * set_order_payment_reference(order_number, payment_reference, note)
--
-- Safe to run multiple times.
-- =============================================================================

-- ── 1. ORDERS: gateway reference column ─────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_payment_reference
  ON public.orders (payment_reference);

-- ── 2. CATALOG SEED (insert-if-missing) ─────────────────────────────────────
-- Categories used by the catalog that are not in the base seed.
INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('tablets', 'Tablets', 'tablets', 6),
  ('android', 'Android Phones', 'android', 7),
  ('smartwatches', 'Smartwatches', 'smartwatches', 8),
  ('gaming', 'Gaming', 'gaming', 9),
  ('smart_home', 'Smart Home', 'smart_home', 10),
  ('cameras', 'Cameras', 'cameras', 11)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Products: one INSERT per SKU inside an exception-swallowing block so a row
-- that already exists (by id OR by slug) is skipped without aborting the run.
DO $$
DECLARE
  skipped integer := 0;
  inserted integer := 0;
BEGIN
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP15PM-256', 'iPhone 15 Pro Max 256GB — Dual SIM', 'vg-ip15pm-256', 'iphones', 16500, 18000, 'HOT', 'https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('iphone-15-pro-128-uk-used-92', 'iPhone 15 Pro 128GB Natural Titanium — UK Used', 'iphone-15-pro-128-uk-used-92', 'iphones', 11200, 14500, 'UK USED • BH 92%', 'uploads/clean_15_pro.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP14PM-256', 'iPhone 14 Pro Max 256GB — Deep Purple', 'vg-ip14pm-256', 'iphones', 13500, 15000, 'DEAL', 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP13-128', 'iPhone 13 128GB — Midnight', 'vg-ip13-128', 'iphones', 6800, 7500, 'HOT', 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP15-128', 'iPhone 15 128GB — Blue Dual SIM', 'vg-ip15-128', 'iphones', 9900, 11000, 'SEALED', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SS24U-512', 'Samsung Galaxy S24 Ultra 512GB', 'vg-ss24u-512', 'samsung', 15200, 16800, 'HOT', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SS23U-256', 'Samsung Galaxy S23 Ultra 256GB', 'vg-ss23u-256', 'samsung', 11500, 13000, 'DEAL', 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SS24-256', 'Samsung Galaxy S24 256GB — Marble Gray', 'vg-ss24-256', 'samsung', 8900, 9800, 'SEALED', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SSA55-256', 'Samsung Galaxy A55 256GB — Awesome Navy', 'vg-ssa55-256', 'samsung', 4200, 4800, 'DEAL', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SSFOLD5-512', 'Samsung Galaxy Z Fold 5 512GB', 'vg-ssfold5-512', 'samsung', 18500, 20500, 'HOT', 'https://images.unsplash.com/photo-1662948402327-e5ef1ac44e93?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-MBP-M3-16-512', 'MacBook Pro M3 16GB/512GB — Space Black', 'vg-mbp-m3-16-512', 'laptops', 22500, 24500, 'SEALED', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-MBP-M3P-18-512', 'MacBook Pro M3 Pro 18GB/512GB — Space Black', 'vg-mbp-m3p-18-512', 'laptops', 28900, 31000, 'HOT', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-MBA-M2-13-256', 'MacBook Air M2 13-inch 8GB/256GB — Midnight', 'vg-mba-m2-13-256', 'laptops', 12800, 14000, 'DEAL', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-MBA-M2-15-512', 'MacBook Air M2 15-inch 8GB/512GB — Starlight', 'vg-mba-m2-15-512', 'laptops', 16900, 18200, 'SEALED', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-HP-SPECTRE-16-1T', 'HP Spectre x360 13.5-inch i7 16GB/1TB', 'vg-hp-spectre-16-1t', 'laptops', 14500, 16000, 'DEAL', 'https://images.unsplash.com/photo-1583223667854-e0e05b1ad2ad?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-DELL-XPS13P', 'Dell XPS 13 Plus i7 16GB/512GB — Platinum', 'vg-dell-xps13p', 'laptops', 13200, 14800, 'SEALED', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IPAD-PRO11-M4-256', 'iPad Pro 11-inch M4 256GB — WiFi', 'vg-ipad-pro11-m4-256', 'tablets', 12500, 13800, 'HOT', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IPAD-AIR-M2-128', 'iPad Air M2 11-inch 128GB — Blue', 'vg-ipad-air-m2-128', 'tablets', 6900, 7600, 'SEALED', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AIRPODS-PRO2-USBC', 'AirPods Pro 2nd Gen USB-C', 'vg-airpods-pro2-usbc', 'audio', 3200, 3800, 'HOT', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AIRPODS-MAX-SG', 'AirPods Max — Space Gray', 'vg-airpods-max-sg', 'audio', 6500, 7200, 'SEALED', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SONY-XM5-BLK', 'Sony WH-1000XM5 Wireless Headset — Black', 'vg-sony-xm5-blk', 'audio', 4100, 4600, 'DEAL', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-JBL-CHARGE5-BLK', 'JBL Charge 5 Bluetooth Speaker — Black', 'vg-jbl-charge5-blk', 'audio', 1650, 1950, 'HOT', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e11?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-ANKER-PB-20K-65W', 'Anker 20,000mAh 65W Power Bank — PowerCore 24K', 'vg-anker-pb-20k-65w', 'power', 1250, 1500, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-APPLE-67W-CABLE', 'Apple 67W USB-C Power Adapter + 2M Cable', 'vg-apple-67w-cable', 'power', 850, 1050, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SS-45W-BLK', 'Samsung Galaxy 45W Super Fast Charger — Black', 'vg-ss-45w-blk', 'power', 450, 600, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-17AIR', 'iPhone 17 Air 256GB — Ultra Slim (White)', 'vg-aw-17air', 'iphones', 19500, 21500, 'NEW', 'uploads/clean_17_air.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-16SNAP', 'iPhone 16 128GB — White (Snapchat Banned)', 'vg-aw-16snap', 'iphones', 8500, 11000, 'BARGAIN', 'uploads/clean_16_snapchat.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-17PROMAX', 'iPhone 17 Pro Max 256GB — Premium Titanium', 'vg-aw-17promax', 'iphones', 22000, 24000, 'NEW', 'uploads/clean_17_promax.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('iphone-13-pro-max-128-uk-used', 'iPhone 13 Pro Max 128GB — UK Used Sierra Blue / Gold', 'iphone-13-pro-max-128-uk-used', 'iphones', 7900, 8800, 'UK USED • SWAP ALLOWED', 'uploads/clean_13_promax.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-13', 'iPhone 13 128GB — UK Used Multi-Colors', 'vg-aw-13', 'iphones', 5600, 6400, 'UK USED', 'uploads/clean_13.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-AIRPODS4', 'Apple AirPods 4 — Sealed Box', 'vg-aw-airpods4', 'audio', 2200, 2600, 'SEALED', 'uploads/clean_airpods_4.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-AIRPODSPRO3', 'Apple AirPods Pro 3 — Sealed Box', 'vg-aw-airpodspro3', 'audio', 3800, 4400, 'SEALED', 'uploads/clean_airpods_pro3.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IPX-256', 'iPhone X 256GB — Silver', 'vg-ipx-256', 'iphones', 2950, 3400, 'CLASSIC', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IPXSMAX-256', 'iPhone XS Max 256GB — Space Gray', 'vg-ipxsmax-256', 'iphones', 3900, 4400, 'CLASSIC', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP11-128', 'iPhone 11 128GB — White', 'vg-ip11-128', 'iphones', 4400, 4900, 'DEAL', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP11PM-256', 'iPhone 11 Pro Max 256GB — Midnight Green', 'vg-ip11pm-256', 'iphones', 5800, 6500, 'HOT', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP12-128', 'iPhone 12 128GB — Black', 'vg-ip12-128', 'iphones', 6200, 6800, 'HOT', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP12PM-128', 'iPhone 12 Pro Max 128GB — Pacific Blue', 'vg-ip12pm-128', 'iphones', 8900, 9800, 'DEAL', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-IP14P-128', 'iPhone 14 Pro 128GB — Space Black', 'vg-ip14p-128', 'iphones', 11500, 12500, 'SEALED', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SSA05S-128', 'Samsung Galaxy A05s 128GB — Light Green', 'vg-ssa05s-128', 'samsung', 1450, 1800, 'DEAL', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SSA22-128', 'Samsung Galaxy A22 5G 128GB — Gray', 'vg-ssa22-128', 'samsung', 1800, 2200, 'SEALED', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SSA15-128', 'Samsung Galaxy A15 128GB — Awesome Blue', 'vg-ssa15-128', 'samsung', 2100, 2500, 'HOT', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SSA16-128', 'Samsung Galaxy A16 5G 128GB — Awesome Black', 'vg-ssa16-128', 'samsung', 2900, 3400, 'SEALED', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-GEVEY-RSIM18', 'R-SIM 18 Club Gevey Unlock Chip for iPhones', 'vg-gevey-rsim18', 'power', 380, 500, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-PARTS-SIM-PIN', 'Heavy-Duty SIM Ejector Pin Keyring (5-Pack)', 'vg-parts-sim-pin', 'power', 90, 150, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-CASE-SPG-15PM', 'Spigen Rugged Armor Case for iPhone 15 Pro Max', 'vg-case-spg-15pm', 'power', 350, 450, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-CASE-APL-MS', 'Apple MagSafe Silicone Case for iPhone 15 Pro Max', 'vg-case-apl-ms', 'power', 450, 600, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-GLASS-SPG-EZ', 'Spigen EZ Fit Tempered Glass Screen Protector (2-Pack)', 'vg-glass-spg-ez', 'power', 250, 350, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-CAR-BASEUS-MS', 'Baseus 15W MagSafe Magnetic Car Charger Mount', 'vg-car-baseus-ms', 'power', 550, 750, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-APL-AIRTAG-1', 'Apple AirTag Bluetooth Tracker (1-Pack)', 'vg-apl-airtag-1', 'power', 550, 700, 'SEALED', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-PIX-8P', 'Google Pixel 8 Pro 128GB — Obsidian', 'vg-pix-8p', 'android', 8500, 9500, 'HOT', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-OP12-256', 'OnePlus 12 256GB — Silky Black', 'vg-op12-256', 'android', 9200, 10200, 'HOT', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-XIA-RN13P', 'Xiaomi Redmi Note 13 Pro+ 5G 256GB', 'vg-xia-rn13p', 'android', 4800, 5400, 'DEAL', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-ANK-8IN1', 'Anker 8-in-1 USB-C Hub Adapter', 'vg-ank-8in1', 'power', 950, 1200, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-LOGI-MX3S', 'Logitech MX Master 3S Wireless Mouse', 'vg-logi-mx3s', 'power', 1450, 1750, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-UG-STAND', 'Ugreen Ergonomic Aluminum Laptop Stand', 'vg-ug-stand', 'power', 450, 600, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-PARTS-15PM-SCR', 'Original iPhone 15 Pro Max Replacement Screen', 'vg-parts-15pm-scr', 'power', 3200, 3800, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-PARTS-IP13-BAT', 'Original iPhone 13 Replacement Battery', 'vg-parts-ip13-bat', 'power', 650, 800, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-PARTS-S24U-CAM', 'Original Samsung Galaxy S24 Ultra Camera Glass', 'vg-parts-s24u-cam', 'power', 350, 500, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-AW-S9-45', 'Apple Watch Series 9 GPS 45mm', 'vg-aw-s9-45', 'smartwatches', 5500, 6200, 'HOT', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-GW6-44', 'Samsung Galaxy Watch 6 44mm — Graphite', 'vg-gw6-44', 'smartwatches', 3900, 4400, 'SEALED', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('ps5-1tb-new-sealed-slim', 'PS5 1TB Slim — Brand New Sealed — Disc Edition', 'ps5-1tb-new-sealed-slim', 'gaming', 7800, 8500, 'SEALED — NEW', 'uploads/clean_ps5.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('ps5-1tb-very-neat-used-001', 'PS5 1TB — UK Used Very Neat — 1 Controller', 'ps5-1tb-very-neat-used-001', 'gaming', 5800, 6800, 'REFURBISHED • VERY NEAT', 'uploads/clean_ps5.png', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('hp-elitebook-1030-g2-x360', 'HP EliteBook 1030 G2 x360 — i7 7th Gen, 8GB / 256GB', 'hp-elitebook-1030-g2-x360', 'laptops', 3900, 4500, 'x360 TOUCH • REFURBISHED', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-NS-OLED', 'Nintendo Switch OLED Model — Neon Blue/Red', 'vg-ns-oled', 'gaming', 4200, 4800, 'DEAL', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SH-BULB-01', 'TP-Link Tapo Smart Wi-Fi Bulb — Colour', 'vg-sh-bulb-01', 'smart_home', 380, 500, 'NEW', 'https://images.unsplash.com/photo-1550985543-f47f8d7a8c8e?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-SH-CAM-01', 'TP-Link Tapo C210 Indoor Security Camera', 'vg-sh-cam-01', 'smart_home', 950, 1200, 'DEAL', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-NET-AX1500', 'TP-Link Archer AX1500 Wi-Fi 6 Router', 'vg-net-ax1500', 'power', 1450, 1750, 'HOT', 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-NET-MESH-02', 'TP-Link Deco Mesh Wi-Fi System — 2 Pack', 'vg-net-mesh-02', 'power', 2850, 3300, 'DEAL', 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-CAM-RING-01', 'LED Ring Light with Tripod — Creator Kit', 'vg-cam-ring-01', 'cameras', 650, 850, 'DEAL', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-CAM-MIC-01', 'Wireless Lavalier Microphone — USB-C', 'vg-cam-mic-01', 'cameras', 780, 1000, 'HOT', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  BEGIN
    INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
    VALUES ('VG-ANKER-735-65W', 'Anker 735 65W GaN Charger — 3 Port', 'vg-anker-735-65w', 'power', 750, 950, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop', 10, true);
    inserted := inserted + 1;
  EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
    skipped := skipped + 1;
  END;
  RAISE NOTICE 'Valmont-Pay catalog seed: % inserted, % skipped (already present)', inserted, skipped;
END;
$$;

-- ── 3. RPC: mark an order Paid (webhook path, anon-safe) ─────────────────────
-- The Valmont-Pay webhook (/api/valmontpay/webhook) verifies the gateway
-- HMAC-SHA512 signature FIRST, then calls this with the signed amount. The
-- transition to 'Paid' only happens when the stored total matches the paid
-- amount at pesewa precision. Repeats are idempotent ('already_paid').
--
-- Stock decrement: product stock is reduced exactly ONCE, inside the same
-- transaction as the Pending→Paid transition. Repeat webhook deliveries hit
-- the 'already_paid' branch above the decrement, so stock can never be
-- double-decremented by gateway retries.
CREATE OR REPLACE FUNCTION public.confirm_order_paid(
  p_reference text,
  p_expected_total numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
BEGIN
  IF p_reference IS NULL OR btrim(p_reference) = '' THEN
    RETURN jsonb_build_object('result', 'invalid_reference');
  END IF;

  SELECT id, order_number, total, status, items INTO o
  FROM public.orders
  WHERE order_number = p_reference OR payment_reference = p_reference
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;

  IF o.status = 'Paid' THEN
    RETURN jsonb_build_object('result', 'already_paid', 'order_number', o.order_number);
  END IF;

  -- Pesewa-precision comparison (GH₵ amounts never have sub-pesewa fractions).
  IF p_expected_total IS NULL OR round(o.total, 2) <> round(p_expected_total, 2) THEN
    RETURN jsonb_build_object(
      'result', 'amount_mismatch',
      'order_number', o.order_number,
      'order_total', o.total
    );
  END IF;

  -- Decrement product stock (floor at 0). Runs only on this transition,
  -- so gateway retries can never decrement twice.
  UPDATE public.products pr
  SET stock = GREATEST(coalesce(pr.stock, 0) - line.qty, 0),
      updated_at = timezone('utc'::text, now())
  FROM (
    SELECT (it->>'product_id')::text AS pid,
           GREATEST(coalesce((it->>'quantity')::int, 1), 1) AS qty
    FROM jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) AS it
    WHERE it->>'product_id' IS NOT NULL
  ) line
  WHERE pr.id = line.pid;

  UPDATE public.orders
  SET status = 'Paid',
      admin_notes = trim(coalesce(admin_notes, '') || E'\n' ||
        '[Valmont-Pay] ' || to_char(timezone('utc'::text, now()), 'YYYY-MM-DD HH24:MI:SS') ||
        ' UTC — charge.success verified for ' || p_reference),
      updated_at = timezone('utc'::text, now())
  WHERE id = o.id;

  RETURN jsonb_build_object('result', 'paid', 'order_number', o.order_number, 'order_total', o.total);
END;
$$;

-- ── 4. RPC: store the gateway VP-… reference (initialize path, anon-safe) ───
CREATE OR REPLACE FUNCTION public.set_order_payment_reference(
  p_order_number text,
  p_payment_reference text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
BEGIN
  IF p_order_number IS NULL OR btrim(p_order_number) = '' THEN
    RETURN jsonb_build_object('result', 'invalid_order_number');
  END IF;

  SELECT id, order_number INTO o
  FROM public.orders
  WHERE order_number = p_order_number
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;

  UPDATE public.orders
  SET payment_reference = p_payment_reference,
      admin_notes = CASE
        WHEN p_note IS NULL OR btrim(p_note) = '' THEN admin_notes
        ELSE trim(coalesce(admin_notes, '') || E'\n' || '[Valmont-Pay] ' || p_note)
      END,
      updated_at = timezone('utc'::text, now())
  WHERE id = o.id;

  RETURN jsonb_build_object('result', 'ok', 'order_number', o.order_number);
END;
$$;

-- Grants: anon gets ONLY these two narrow entry points; no direct UPDATE on orders.
REVOKE ALL ON FUNCTION public.confirm_order_paid(text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.confirm_order_paid(text, numeric) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_order_payment_reference(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_order_payment_reference(text, text, text) TO anon, authenticated, service_role;
