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

-- Products: insert-if-missing. A SKU that already exists (by id OR by slug)
-- is skipped without aborting the run; existing rows are NEVER updated.
-- Slug is derived from the id (lowercase, non-alphanumerics → '-').
DO $$
DECLARE
  r record;
  skipped integer := 0;
  inserted integer := 0;
BEGIN
  FOR r IN
    SELECT v.*
    FROM (VALUES
      ('VG-IP15PM-256', 'iPhone 15 Pro Max 256GB — Dual SIM', 'iphones', 16500, 18000, 'HOT', 'https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop'),
      ('iphone-15-pro-128-uk-used-92', 'iPhone 15 Pro 128GB Natural Titanium — UK Used', 'iphones', 11200, 14500, 'UK USED • BH 92%', 'uploads/clean_15_pro.png'),
      ('VG-IP14PM-256', 'iPhone 14 Pro Max 256GB — Deep Purple', 'iphones', 13500, 15000, 'DEAL', 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP13-128', 'iPhone 13 128GB — Midnight', 'iphones', 6800, 7500, 'HOT', 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP15-128', 'iPhone 15 128GB — Blue Dual SIM', 'iphones', 9900, 11000, 'SEALED', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop'),
      ('VG-SS24U-512', 'Samsung Galaxy S24 Ultra 512GB', 'samsung', 15200, 16800, 'HOT', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop'),
      ('VG-SS23U-256', 'Samsung Galaxy S23 Ultra 256GB', 'samsung', 11500, 13000, 'DEAL', 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?q=80&w=800&auto=format&fit=crop'),
      ('VG-SS24-256', 'Samsung Galaxy S24 256GB — Marble Gray', 'samsung', 8900, 9800, 'SEALED', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=800&auto=format&fit=crop'),
      ('VG-SSA55-256', 'Samsung Galaxy A55 256GB — Awesome Navy', 'samsung', 4200, 4800, 'DEAL', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop'),
      ('VG-SSFOLD5-512', 'Samsung Galaxy Z Fold 5 512GB', 'samsung', 18500, 20500, 'HOT', 'https://images.unsplash.com/photo-1662948402327-e5ef1ac44e93?q=80&w=800&auto=format&fit=crop'),
      ('VG-MBP-M3-16-512', 'MacBook Pro M3 16GB/512GB — Space Black', 'laptops', 22500, 24500, 'SEALED', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop'),
      ('VG-MBP-M3P-18-512', 'MacBook Pro M3 Pro 18GB/512GB — Space Black', 'laptops', 28900, 31000, 'HOT', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop'),
      ('VG-MBA-M2-13-256', 'MacBook Air M2 13-inch 8GB/256GB — Midnight', 'laptops', 12800, 14000, 'DEAL', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop'),
      ('VG-MBA-M2-15-512', 'MacBook Air M2 15-inch 8GB/512GB — Starlight', 'laptops', 16900, 18200, 'SEALED', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop'),
      ('VG-HP-SPECTRE-16-1T', 'HP Spectre x360 13.5-inch i7 16GB/1TB', 'laptops', 14500, 16000, 'DEAL', 'https://images.unsplash.com/photo-1583223667854-e0e05b1ad2ad?q=80&w=800&auto=format&fit=crop'),
      ('VG-DELL-XPS13P', 'Dell XPS 13 Plus i7 16GB/512GB — Platinum', 'laptops', 13200, 14800, 'SEALED', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop'),
      ('VG-IPAD-PRO11-M4-256', 'iPad Pro 11-inch M4 256GB — WiFi', 'tablets', 12500, 13800, 'HOT', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop'),
      ('VG-IPAD-AIR-M2-128', 'iPad Air M2 11-inch 128GB — Blue', 'tablets', 6900, 7600, 'SEALED', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop'),
      ('VG-AIRPODS-PRO2-USBC', 'AirPods Pro 2nd Gen USB-C', 'audio', 3200, 3800, 'HOT', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=800&auto=format&fit=crop'),
      ('VG-AIRPODS-MAX-SG', 'AirPods Max — Space Gray', 'audio', 6500, 7200, 'SEALED', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop'),
      ('VG-SONY-XM5-BLK', 'Sony WH-1000XM5 Wireless Headset — Black', 'audio', 4100, 4600, 'DEAL', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop'),
      ('VG-JBL-CHARGE5-BLK', 'JBL Charge 5 Bluetooth Speaker — Black', 'audio', 1650, 1950, 'HOT', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e11?q=80&w=800&auto=format&fit=crop'),
      ('VG-ANKER-PB-20K-65W', 'Anker 20,000mAh 65W Power Bank — PowerCore 24K', 'power', 1250, 1500, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-APPLE-67W-CABLE', 'Apple 67W USB-C Power Adapter + 2M Cable', 'power', 850, 1050, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-SS-45W-BLK', 'Samsung Galaxy 45W Super Fast Charger — Black', 'power', 450, 600, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-AW-17AIR', 'iPhone 17 Air 256GB — Ultra Slim (White)', 'iphones', 19500, 21500, 'NEW', 'uploads/clean_17_air.png'),
      ('VG-AW-16SNAP', 'iPhone 16 128GB — White (Snapchat Banned)', 'iphones', 8500, 11000, 'BARGAIN', 'uploads/clean_16_snapchat.png'),
      ('VG-AW-17PROMAX', 'iPhone 17 Pro Max 256GB — Premium Titanium', 'iphones', 22000, 24000, 'NEW', 'uploads/clean_17_promax.png'),
      ('iphone-13-pro-max-128-uk-used', 'iPhone 13 Pro Max 128GB — UK Used Sierra Blue / Gold', 'iphones', 7900, 8800, 'UK USED • SWAP ALLOWED', 'uploads/clean_13_promax.png'),
      ('VG-AW-13', 'iPhone 13 128GB — UK Used Multi-Colors', 'iphones', 5600, 6400, 'UK USED', 'uploads/clean_13.png'),
      ('VG-AW-AIRPODS4', 'Apple AirPods 4 — Sealed Box', 'audio', 2200, 2600, 'SEALED', 'uploads/clean_airpods_4.png'),
      ('VG-AW-AIRPODSPRO3', 'Apple AirPods Pro 3 — Sealed Box', 'audio', 3800, 4400, 'SEALED', 'uploads/clean_airpods_pro3.png'),
      ('VG-IPX-256', 'iPhone X 256GB — Silver', 'iphones', 2950, 3400, 'CLASSIC', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-IPXSMAX-256', 'iPhone XS Max 256GB — Space Gray', 'iphones', 3900, 4400, 'CLASSIC', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP11-128', 'iPhone 11 128GB — White', 'iphones', 4400, 4900, 'DEAL', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP11PM-256', 'iPhone 11 Pro Max 256GB — Midnight Green', 'iphones', 5800, 6500, 'HOT', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP12-128', 'iPhone 12 128GB — Black', 'iphones', 6200, 6800, 'HOT', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP12PM-128', 'iPhone 12 Pro Max 128GB — Pacific Blue', 'iphones', 8900, 9800, 'DEAL', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-IP14P-128', 'iPhone 14 Pro 128GB — Space Black', 'iphones', 11500, 12500, 'SEALED', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'),
      ('VG-SSA05S-128', 'Samsung Galaxy A05s 128GB — Light Green', 'samsung', 1450, 1800, 'DEAL', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop'),
      ('VG-SSA22-128', 'Samsung Galaxy A22 5G 128GB — Gray', 'samsung', 1800, 2200, 'SEALED', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop'),
      ('VG-SSA15-128', 'Samsung Galaxy A15 128GB — Awesome Blue', 'samsung', 2100, 2500, 'HOT', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop'),
      ('VG-SSA16-128', 'Samsung Galaxy A16 5G 128GB — Awesome Black', 'samsung', 2900, 3400, 'SEALED', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop'),
      ('VG-GEVEY-RSIM18', 'R-SIM 18 Club Gevey Unlock Chip for iPhones', 'power', 380, 500, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-PARTS-SIM-PIN', 'Heavy-Duty SIM Ejector Pin Keyring (5-Pack)', 'power', 90, 150, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-CASE-SPG-15PM', 'Spigen Rugged Armor Case for iPhone 15 Pro Max', 'power', 350, 450, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-CASE-APL-MS', 'Apple MagSafe Silicone Case for iPhone 15 Pro Max', 'power', 450, 600, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-GLASS-SPG-EZ', 'Spigen EZ Fit Tempered Glass Screen Protector (2-Pack)', 'power', 250, 350, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-CAR-BASEUS-MS', 'Baseus 15W MagSafe Magnetic Car Charger Mount', 'power', 550, 750, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-APL-AIRTAG-1', 'Apple AirTag Bluetooth Tracker (1-Pack)', 'power', 550, 700, 'SEALED', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop'),
      ('VG-PIX-8P', 'Google Pixel 8 Pro 128GB — Obsidian', 'android', 8500, 9500, 'HOT', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop'),
      ('VG-OP12-256', 'OnePlus 12 256GB — Silky Black', 'android', 9200, 10200, 'HOT', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop'),
      ('VG-XIA-RN13P', 'Xiaomi Redmi Note 13 Pro+ 5G 256GB', 'android', 4800, 5400, 'DEAL', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop'),
      ('VG-ANK-8IN1', 'Anker 8-in-1 USB-C Hub Adapter', 'power', 950, 1200, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-LOGI-MX3S', 'Logitech MX Master 3S Wireless Mouse', 'power', 1450, 1750, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-UG-STAND', 'Ugreen Ergonomic Aluminum Laptop Stand', 'power', 450, 600, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-PARTS-15PM-SCR', 'Original iPhone 15 Pro Max Replacement Screen', 'power', 3200, 3800, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-PARTS-IP13-BAT', 'Original iPhone 13 Replacement Battery', 'power', 650, 800, 'SEALED', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-PARTS-S24U-CAM', 'Original Samsung Galaxy S24 Ultra Camera Glass', 'power', 350, 500, 'DEAL', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop'),
      ('VG-AW-S9-45', 'Apple Watch Series 9 GPS 45mm', 'smartwatches', 5500, 6200, 'HOT', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop'),
      ('VG-GW6-44', 'Samsung Galaxy Watch 6 44mm — Graphite', 'smartwatches', 3900, 4400, 'SEALED', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop'),
      ('ps5-1tb-new-sealed-slim', 'PS5 1TB Slim — Brand New Sealed — Disc Edition', 'gaming', 7800, 8500, 'SEALED — NEW', 'uploads/clean_ps5.png'),
      ('ps5-1tb-very-neat-used-001', 'PS5 1TB — UK Used Very Neat — 1 Controller', 'gaming', 5800, 6800, 'REFURBISHED • VERY NEAT', 'uploads/clean_ps5.png'),
      ('hp-elitebook-1030-g2-x360', 'HP EliteBook 1030 G2 x360 — i7 7th Gen, 8GB / 256GB', 'laptops', 3900, 4500, 'x360 TOUCH • REFURBISHED', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop'),
      ('VG-NS-OLED', 'Nintendo Switch OLED Model — Neon Blue/Red', 'gaming', 4200, 4800, 'DEAL', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=800&auto=format&fit=crop'),
      ('VG-SH-BULB-01', 'TP-Link Tapo Smart Wi-Fi Bulb — Colour', 'smart_home', 380, 500, 'NEW', 'https://images.unsplash.com/photo-1550985543-f47f8d7a8c8e?q=80&w=800&auto=format&fit=crop'),
      ('VG-SH-CAM-01', 'TP-Link Tapo C210 Indoor Security Camera', 'smart_home', 950, 1200, 'DEAL', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=800&auto=format&fit=crop'),
      ('VG-NET-AX1500', 'TP-Link Archer AX1500 Wi-Fi 6 Router', 'power', 1450, 1750, 'HOT', 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?q=80&w=800&auto=format&fit=crop'),
      ('VG-NET-MESH-02', 'TP-Link Deco Mesh Wi-Fi System — 2 Pack', 'power', 2850, 3300, 'DEAL', 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?q=80&w=800&auto=format&fit=crop'),
      ('VG-CAM-RING-01', 'LED Ring Light with Tripod — Creator Kit', 'cameras', 650, 850, 'DEAL', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=800&auto=format&fit=crop'),
      ('VG-CAM-MIC-01', 'Wireless Lavalier Microphone — USB-C', 'cameras', 780, 1000, 'HOT', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800&auto=format&fit=crop'),
      ('VG-ANKER-735-65W', 'Anker 735 65W GaN Charger — 3 Port', 'power', 750, 950, 'HOT', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop')
    ) AS v(id, name, category_id, price, compare_at_price, badge, image_url)
  LOOP
    BEGIN
      INSERT INTO public.products (id, name, slug, category_id, price, compare_at_price, badge, image_url, stock, is_active)
      VALUES (r.id, r.name, trim(both '-' from lower(regexp_replace(r.id, '[^a-z0-9]+', '-', 'g'))), r.category_id, r.price, r.compare_at_price, r.badge, r.image_url, 10, true);
      inserted := inserted + 1;
    EXCEPTION WHEN unique_violation OR foreign_key_violation THEN
      skipped := skipped + 1;
    END;
  END LOOP;
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
