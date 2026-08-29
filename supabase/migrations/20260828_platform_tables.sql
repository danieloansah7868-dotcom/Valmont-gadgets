-- ==============================================================================
-- Valmont Gadgets — Platform tables: swap & sell, UK/US used, wholesale,
--                    store partners, promotions, audit
--
-- Migration: 20260828_platform_tables.sql
--
-- Design rules (they mirror 20260814000100_production_hardening.sql and
-- 20260811_admin_email_allowlist.sql, which this migration depends on):
--
--   * The browser never mutates these tables. Every write is a SECURITY DEFINER
--     function that derives the actor from auth.uid(), validates and re-prices
--     what it stores, and logs itself. Nothing on this list can be faked from
--     devtools: no client-supplied price, seller identity, approval, ban lift,
--     or "paid" flag.
--   * Reads are narrow functions. A Ghana Card never leaves Postgres in the
--     clear, supplier cost is only handed to an approved dealer, and sold used
--     stock is never shown as available.
--   * Anti-spam budgets are enforced per account in the database. The counter
--     in assets/js/security.js only paces the UI.
--   * Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT.
--
-- Apply with the Supabase SQL editor or `supabase db push`.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 0. Upgrade path for projects that ran an earlier draft ───────────────────
DO $$
BEGIN
    -- v0 had password_hash/face_photo_url on sellers and a text seller_id on
    -- listings. Identity now belongs to Supabase Auth, so the plaintext
    -- columns must not survive.
    IF to_regclass('public.sellers') IS NOT NULL THEN
        ALTER TABLE public.sellers DROP COLUMN IF EXISTS password_hash;
        ALTER TABLE public.sellers DROP COLUMN IF EXISTS face_photo_url;
    END IF;
    IF to_regclass('public.swap_listings') IS NOT NULL THEN
        ALTER TABLE public.swap_listings DROP COLUMN IF EXISTS seller_id;
    END IF;
    IF to_regclass('public.wholesale_dealers') IS NOT NULL THEN
        ALTER TABLE public.wholesale_dealers DROP COLUMN IF EXISTS seller_id;
    END IF;
    IF to_regclass('public.partner_applications') IS NOT NULL THEN
        ALTER TABLE public.partner_applications DROP COLUMN IF EXISTS password_hash;
    END IF;
EXCEPTION WHEN undefined_object OR undefined_table THEN
    NULL;
END;
$$;

-- ── 1. SELLERS ──────────────────────────────────────────────────────────────
-- Identity lives in Supabase Auth. This table is the marketplace profile only:
-- display name, contact, city, and a one-way fingerprint of the Ghana Card used
-- to catch duplicate accounts. Passwords are never stored here.
CREATE TABLE IF NOT EXISTS public.sellers (
    id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    auth_user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name        text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 80),
    phone               text,
    city                text,
    ghana_card_hash     text UNIQUE,
    ghana_card_masked   text,
    ghana_card_verified boolean NOT NULL DEFAULT false,
    face_verified       boolean NOT NULL DEFAULT false,
    is_banned           boolean NOT NULL DEFAULT false,
    ban_reason          text,
    created_at          timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at          timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON COLUMN public.sellers.ghana_card_hash IS
  'SHA-256 over (pepper || card PIN). Deterministic so a card reused across '
  'accounts is detectable, and peppered so a table dump cannot be brute forced. '
  'The card number itself is never stored. See public.identity_pepper().';
COMMENT ON COLUMN public.sellers.ghana_card_masked IS
  'Staff hint ("GHA-•••••6789-0"). Never returned by a public read.';

-- ── 2. SWAP LISTINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.swap_listings (
    id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    seller_auth_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_name       text NOT NULL,
    seller_phone      text,
    seller_verified   boolean NOT NULL DEFAULT false,
    listing_type      text NOT NULL DEFAULT 'swap' CHECK (listing_type IN ('swap','sell','both')),
    category          text NOT NULL DEFAULT 'phones',
    brand             text NOT NULL,
    model             text NOT NULL,
    storage           text,
    color             text,
    grade             text CHECK (grade IN ('A','B','C')),
    battery_health    integer CHECK (battery_health IS NULL OR (battery_health BETWEEN 1 AND 100)),
    screen_condition  text,
    body_condition    text,
    included          text,
    want              text,
    price             numeric(12,2) CHECK (price IS NULL OR (price >= 0 AND price <= 2000000)),
    budget_min        numeric(12,2),
    budget_max        numeric(12,2),
    notes             text,
    images            jsonb NOT NULL DEFAULT '[]'::jsonb,
    city              text,
    status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','sold','removed','rejected')),
    is_promoted       boolean NOT NULL DEFAULT false,
    promo_expires_at  timestamptz,
    views             integer NOT NULL DEFAULT 0,
    leads_count       integer NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at        timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_swap_listings_status   ON public.swap_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swap_listings_seller   ON public.swap_listings(seller_auth_id);
CREATE INDEX IF NOT EXISTS idx_swap_listings_promoted ON public.swap_listings(is_promoted, status);

-- ── 3. SWAP LEADS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.swap_leads (
    id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    listing_id     text NOT NULL REFERENCES public.swap_listings(id) ON DELETE CASCADE,
    seller_auth_id uuid NOT NULL,
    buyer_auth_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    buyer_name     text NOT NULL,
    buyer_phone    text,
    message        text NOT NULL CHECK (length(message) BETWEEN 5 AND 600),
    status         text NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','closed')),
    created_at     timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_swap_leads_listing ON public.swap_leads(listing_id, created_at DESC);

-- ── 4. UK/US USED INVENTORY ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.used_inventory (
    id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    origin           text NOT NULL CHECK (origin IN ('uk','us')),
    brand            text NOT NULL,
    name             text NOT NULL,
    storage          text,
    color            text,
    grade            text CHECK (grade IN ('A','B','C')),
    battery_health   integer CHECK (battery_health IS NULL OR (battery_health BETWEEN 1 AND 100)),
    price            numeric(12,2) NOT NULL CHECK (price >= 0 AND price <= 2000000),
    was_price        numeric(12,2) CHECK (was_price IS NULL OR (was_price >= 0 AND was_price <= 2000000)),
    screen_condition text,
    body_condition   text,
    charger_included text,
    images           jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_sold          boolean NOT NULL DEFAULT false,
    sold_at          timestamptz,
    listed_date      date NOT NULL DEFAULT current_date,
    created_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at       timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.used_inventory ADD COLUMN IF NOT EXISTS sold_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_used_inventory_board ON public.used_inventory(origin, is_sold, listed_date DESC);

-- ── 5. WHOLESALE DEALERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_dealers (
    id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    auth_user_id  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name text NOT NULL,
    contact_name  text NOT NULL,
    phone         text,
    email         text,
    city          text,
    status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    reviewed_by   text,
    reviewed_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_wholesale_dealers_status ON public.wholesale_dealers(status);

-- ── 6. WHOLESALE ORDERS ────────────────────────────────────────────────────────
-- Totals are written only by place_wholesale_order(); a client cannot store a
-- price it chose itself.
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
    id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number     text NOT NULL UNIQUE,
    dealer_id        text NOT NULL REFERENCES public.wholesale_dealers(id) ON DELETE CASCADE,
    dealer_name      text NOT NULL,
    items            jsonb NOT NULL DEFAULT '[]'::jsonb,
    unit_count       integer NOT NULL DEFAULT 0,
    subtotal         numeric(12,2) NOT NULL DEFAULT 0,
    delivery_fee     numeric(12,2) NOT NULL DEFAULT 0,
    total            numeric(12,2) NOT NULL DEFAULT 0,
    delivery_address text,
    notes            text,
    status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
    created_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at       timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_dealer ON public.wholesale_orders(dealer_id, created_at DESC);

-- ── 7. STORE PARTNER APPLICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    auth_user_id      uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    shop_name         text NOT NULL,
    contact_name      text NOT NULL,
    phone             text,
    email             text,
    city              text NOT NULL,
    ghana_card_hash   text,
    ghana_card_masked text,
    plan              text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
    monthly_volume    text,
    about             text,
    status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at        timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status, created_at DESC);

-- ── 8. PROMOTION (AD) REQUESTS ─────────────────────────────────────────────────
-- A promotion is a request we verify against a real MoMo/card payment. Nothing
-- in this schema lets a page mark its own listing promoted.
CREATE TABLE IF NOT EXISTS public.ad_payments (
    id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    listing_id     text NOT NULL REFERENCES public.swap_listings(id) ON DELETE CASCADE,
    seller_auth_id uuid NOT NULL,
    seller_name    text NOT NULL,
    plan_hours     integer NOT NULL CHECK (plan_hours IN (24,72,168,720)),
    amount         numeric(12,2) NOT NULL CHECK (amount >= 0 AND amount <= 20000),
    payment_method text,
    reference      text,
    status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
    created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
    approved_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ad_payments_listing ON public.ad_payments(listing_id, status);

-- ── 9. ADMIN AUDIT LOG ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    admin_user text NOT NULL,
    action     text NOT NULL,
    details    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_recent ON public.admin_audit_log(created_at DESC);

-- ── 10. PER-ACCOUNT WRITE BUDGETS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.write_quota (
    actor_auth_id uuid NOT NULL,
    action        text NOT NULL,
    window_start  date NOT NULL DEFAULT current_date,
    used_count    integer NOT NULL DEFAULT 0,
    PRIMARY KEY (actor_auth_id, action, window_start)
);

CREATE OR REPLACE FUNCTION public.consume_write_quota(p_actor uuid, p_action text, p_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    used integer;
BEGIN
    IF p_actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;

    INSERT INTO public.write_quota AS q (actor_auth_id, action, window_start, used_count)
    VALUES (p_actor, p_action, current_date, 1)
    ON CONFLICT (actor_auth_id, action, window_start)
      DO UPDATE SET used_count = q.used_count + 1
    RETURNING used_count INTO used;

    IF used > p_limit THEN
        RAISE EXCEPTION 'Limit reached for this account (% of % today). Please try again tomorrow.', used - 1, p_limit
          USING ERRCODE = '42501';
    END IF;
    RETURN used;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_write_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- ── 11. GHANA CARD FINGERPRINT ─────────────────────────────────────────────────
-- The submitted PIN is validated, hashed, and then dropped: no function in this
-- file returns it, and nothing on any read model echoes it back.
--
-- The hash has to be deterministic across accounts, or it cannot answer the one
-- question it exists for ("has this card already been used to open another
-- account?"). That makes the input space (10^9) small enough to brute force, so
-- a server-side pepper is required to make it useless to a thief who dumps the
-- table. Set it once per project:
--
--   ALTER DATABASE postgres SET valmont.identity_pepper = '<32+ random chars>';
--
-- If the pepper is missing we still refuse to store the card in the clear: the
-- fingerprint becomes an unsalted hash, flagged by identity_pepper_missing, and
-- duplicate detection degrades to "best effort".
CREATE OR REPLACE FUNCTION public.identity_pepper()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT nullif(btrim(coalesce(current_setting('valmont.identity_pepper', true), '')), '')
$$;

REVOKE ALL ON FUNCTION public.identity_pepper() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.derive_card_identity(p_auth uuid, p_card text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
-- `extensions` is where Supabase installs pgcrypto; it is ignored on projects
-- that put it in public. Neither schema is user-writable, so this stays safe
-- against search_path hijacking (pg_temp first-class via the trailing entry).
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    normalized text;
    hashed     text;
BEGIN
    normalized := CASE WHEN upper(btrim(coalesce(p_card, ''))) ~ '^GHA-[0-9]{9}-[0-9]$'
                       THEN upper(btrim(p_card)) END;
    IF normalized IS NULL THEN
        RETURN jsonb_build_object('hash', NULL, 'masked', NULL);
    END IF;

    BEGIN
        SELECT encode(digest(coalesce(public.identity_pepper(), '') || normalized, 'sha256'), 'hex')
          INTO hashed;
    EXCEPTION WHEN OTHERS THEN
        hashed := NULL;
    END;

    RETURN jsonb_build_object(
        'hash', hashed,
        'masked', 'GHA-•••••' || right(normalized, 6),
        'peppered', public.identity_pepper() IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.derive_card_identity(uuid, text) FROM PUBLIC, anon, authenticated;

-- ── 12. SELLER PROFILE ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_seller_profile(
    p_display_name text,
    p_phone        text,
    p_city         text,
    p_ghana_card   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor uuid := auth.uid();
    ident jsonb;
    saved record;
    clash text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    IF btrim(coalesce(p_display_name, '')) = '' THEN
        RAISE EXCEPTION 'a display name is required' USING ERRCODE = '22023';
    END IF;

    ident := public.derive_card_identity(actor, p_ghana_card);

    IF ident ->> 'hash' IS NOT NULL THEN
        SELECT auth_user_id::text INTO clash
          FROM public.sellers
         WHERE ghana_card_hash = (ident ->> 'hash')
           AND auth_user_id <> actor
         LIMIT 1;
        IF clash IS NOT NULL THEN
            RAISE EXCEPTION 'that Ghana Card is already linked to another account' USING ERRCODE = '23505';
        END IF;
    END IF;

    INSERT INTO public.sellers AS s
        (auth_user_id, display_name, phone, city, ghana_card_hash, ghana_card_masked, created_at, updated_at)
    VALUES
        (actor,
         left(btrim(p_display_name), 80),
         left(nullif(btrim(coalesce(p_phone, '')), ''), 20),
         left(nullif(btrim(coalesce(p_city, '')), ''), 60),
         nullif(ident ->> 'hash', ''),
         nullif(ident ->> 'masked', ''),
         timezone('utc', now()),
         timezone('utc', now()))
    ON CONFLICT (auth_user_id) DO UPDATE
      SET display_name      = left(btrim(EXCLUDED.display_name), 80),
          phone             = EXCLUDED.phone,
          city              = EXCLUDED.city,
          ghana_card_hash   = coalesce(s.ghana_card_hash, EXCLUDED.ghana_card_hash),
          ghana_card_masked = coalesce(EXCLUDED.ghana_card_masked, s.ghana_card_masked),
          updated_at        = timezone('utc', now())
    RETURNING s.id, s.phone, s.city, s.ghana_card_verified, s.face_verified, s.is_banned
      INTO saved;

    RETURN jsonb_build_object(
        'id', saved.id,
        'phone', saved.phone,
        'city', saved.city,
        'card_verified', saved.ghana_card_verified,
        'face_verified', saved.face_verified,
        'banned', saved.is_banned
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_seller_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor  uuid := auth.uid();
    result jsonb;
BEGIN
    IF actor IS NULL THEN RETURN NULL; END IF;
    SELECT to_jsonb(t) INTO result FROM (
        SELECT s.id,
               s.display_name AS name,
               s.phone,
               s.city,
               s.ghana_card_verified,
               s.face_verified,
               s.is_banned,
               s.created_at,
               (SELECT count(*) FROM public.swap_listings l
                 WHERE l.seller_auth_id = s.auth_user_id AND l.status = 'active') AS active_listings
        FROM public.sellers s
        WHERE s.auth_user_id = actor
    ) t;
    RETURN result;
END;
$$;

-- ── 13. SWAP LISTING WRITES ────────────────────────────────────────────────────
-- Image URLs are filtered against the hosts the production CSP already allows
-- for <img>, so a listing cannot turn a visitor into a tracking-pixel client.
CREATE OR REPLACE FUNCTION public.create_swap_listing(p_listing jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor    uuid := auth.uid();
    profile  record;
    v_type   text := lower(btrim(coalesce(p_listing ->> 'type', 'swap')));
    v_model  text := btrim(coalesce(p_listing ->> 'model', ''));
    v_brand  text := btrim(coalesce(p_listing ->> 'brand', ''));
    v_price  numeric := nullif(p_listing ->> 'price', '')::numeric;
    v_want   text := btrim(coalesce(p_listing ->> 'want', ''));
    v_images jsonb := '[]'::jsonb;
    v_id     text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    IF p_listing IS NULL OR jsonb_typeof(p_listing) <> 'object' THEN
        RAISE EXCEPTION 'malformed listing' USING ERRCODE = '22P02';
    END IF;

    SELECT * INTO profile FROM public.sellers WHERE auth_user_id = actor;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'save your seller profile first' USING ERRCODE = '28000';
    END IF;
    IF profile.is_banned THEN
        RAISE EXCEPTION 'this account cannot post listings' USING ERRCODE = '42501';
    END IF;

    IF v_type NOT IN ('swap','sell','both') THEN v_type := 'swap'; END IF;
    IF length(v_model) < 3 OR length(v_model) > 90 THEN
        RAISE EXCEPTION 'model name must be 3-90 characters' USING ERRCODE = '22023';
    END IF;
    IF length(v_brand) < 2 OR length(v_brand) > 40 THEN
        RAISE EXCEPTION 'brand is required' USING ERRCODE = '22023';
    END IF;
    IF v_type <> 'sell' AND length(v_want) < 5 THEN
        RAISE EXCEPTION 'say what you want in return' USING ERRCODE = '22023';
    END IF;
    IF v_type <> 'swap' AND (v_price IS NULL OR v_price < 1 OR v_price > 2000000) THEN
        RAISE EXCEPTION 'asking price must be between 1 and 2000000' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(jsonb_agg(url), '[]'::jsonb) INTO v_images
    FROM (
        SELECT url FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(p_listing -> 'images') = 'array'
                 THEN p_listing -> 'images' ELSE '[]'::jsonb END
        ) AS url
        WHERE url ~ '^uploads/[A-Za-z0-9._-]+\.png$'
           OR url ~* '^https://images\.unsplash\.com/'
           OR url ~* '^https://eydsoqnpetqczaeqrscc\.supabase\.co/'
           OR url ~* '^https://valmontgadgets\.com/'
        LIMIT 6
    ) kept;

    PERFORM public.consume_write_quota(actor, 'create_swap_listing', 10);

    INSERT INTO public.swap_listings (
        seller_auth_id, seller_name, seller_phone, seller_verified, listing_type,
        category, brand, model, storage, color, grade, battery_health,
        screen_condition, body_condition, included, want, price,
        budget_min, budget_max, notes, images, city, status
    ) VALUES (
        actor,
        left(profile.display_name, 80),
        profile.phone,
        (profile.face_verified OR profile.ghana_card_verified),
        v_type,
        left(coalesce(nullif(btrim(p_listing ->> 'category'), ''), 'phones'), 40),
        left(v_brand, 40),
        left(v_model, 90),
        left(coalesce(p_listing ->> 'storage', ''), 20),
        left(coalesce(p_listing ->> 'color', ''), 40),
        nullif(upper(coalesce(p_listing ->> 'grade', '')), ''),
        nullif(p_listing ->> 'battery', '')::int,
        left(coalesce(p_listing ->> 'screen', ''), 90),
        left(coalesce(p_listing ->> 'body', ''), 90),
        left(coalesce(p_listing ->> 'included', ''), 160),
        left(v_want, 400),
        v_price,
        nullif(p_listing ->> 'budgetMin', '')::numeric,
        nullif(p_listing ->> 'budgetMax', '')::numeric,
        left(coalesce(p_listing ->> 'notes', ''), 400),
        v_images,
        left(coalesce(profile.city, ''), 60),
        'pending'
    ) RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_swap_listings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor  uuid := auth.uid();
    result jsonb;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC), '[]'::jsonb) INTO result
    FROM public.swap_listings l
    WHERE l.seller_auth_id = actor;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_swap_leads()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor  uuid := auth.uid();
    result jsonb;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id,
        'listing_id', l.listing_id,
        'listing_model', li.model,
        'listing_images', li.images,
        'buyer_name', l.buyer_name,
        'buyer_phone', l.buyer_phone,
        'message', l.message,
        'status', l.status,
        'created_at', l.created_at
    ) ORDER BY l.created_at DESC), '[]'::jsonb) INTO result
    FROM public.swap_leads l
    JOIN public.swap_listings li ON li.id = l.listing_id
    WHERE l.seller_auth_id = actor;
    RETURN result;
END;
$$;

-- A seller may move their own listing between sold/removed/active only.
-- Approving a pending listing is not in this function: that is admin-only.
-- 'active' here means "put my own listing back on the board after I took it
-- down". Approval itself is not in this function: a pending or rejected row can
-- only be made active by admin_set_listing_status, so a seller can never
-- publish their own ad by calling the API directly.
CREATE OR REPLACE FUNCTION public.update_swap_listing_status(p_listing_id text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor      uuid := auth.uid();
    v_id       text;
    v_previous text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    IF p_status NOT IN ('sold','removed','active') THEN
        RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
    END IF;

    SELECT status INTO v_previous
      FROM public.swap_listings
     WHERE id = p_listing_id AND seller_auth_id = actor
     FOR UPDATE;
    IF v_previous IS NULL THEN
        RAISE EXCEPTION 'listing not found' USING ERRCODE = '42501';
    END IF;
    IF p_status = 'active' AND v_previous NOT IN ('sold','removed') THEN
        RAISE EXCEPTION 'a listing is published by our team after review, not by its owner'
          USING ERRCODE = '42501';
    END IF;

    UPDATE public.swap_listings
       SET status = p_status,
           is_promoted = CASE WHEN p_status = 'active' THEN is_promoted ELSE false END,
           promo_expires_at = CASE WHEN p_status = 'active' THEN promo_expires_at ELSE NULL END,
           updated_at = timezone('utc', now())
     WHERE id = p_listing_id AND seller_auth_id = actor
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_listing_view(p_listing_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    UPDATE public.swap_listings SET views = views + 1
     WHERE id = p_listing_id AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.create_swap_lead(p_listing_id text, p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor uuid := auth.uid();
    buyer record;
    item  record;
    v_id  text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required — sign in to message a seller' USING ERRCODE = '28000';
    END IF;
    IF length(btrim(coalesce(p_message, ''))) < 5 OR length(btrim(p_message)) > 600
       OR p_message ~ '[[:cntrl:]]' THEN
        RAISE EXCEPTION 'message must be 5-600 readable characters' USING ERRCODE = '22023';
    END IF;

    SELECT l.seller_auth_id, l.model INTO item
      FROM public.swap_listings l
     WHERE l.id = p_listing_id AND l.status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'that listing is not open for messages' USING ERRCODE = '22023';
    END IF;
    IF item.seller_auth_id = actor THEN
        RAISE EXCEPTION 'you cannot message your own listing' USING ERRCODE = '42501';
    END IF;

    SELECT s.display_name, s.phone INTO buyer FROM public.sellers s WHERE s.auth_user_id = actor;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'save your seller profile first' USING ERRCODE = '28000';
    END IF;

    PERFORM public.consume_write_quota(actor, 'create_swap_lead', 40);

    INSERT INTO public.swap_leads (listing_id, seller_auth_id, buyer_auth_id, buyer_name, buyer_phone, message)
    VALUES (p_listing_id, item.seller_auth_id, actor, buyer.display_name, buyer.phone, btrim(p_message))
    RETURNING id INTO v_id;

    UPDATE public.swap_listings SET leads_count = leads_count + 1 WHERE id = p_listing_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;

-- ── 14. PROMOTION REQUESTS ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_listing_promotion(p_listing_id text, p_plan_hours integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor    uuid := auth.uid();
    item     record;
    v_amount numeric(12,2);
    v_id     text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;

    -- Authoritative schedule. The page only names a period; it cannot set a price.
    v_amount := CASE p_plan_hours
                   WHEN 24  THEN 15
                   WHEN 72  THEN 35
                   WHEN 168 THEN 60
                   WHEN 720 THEN 150
                   ELSE NULL
                 END;
    IF v_amount IS NULL THEN
        RAISE EXCEPTION 'unknown promotion period' USING ERRCODE = '22023';
    END IF;

    SELECT l.id, l.status, l.seller_auth_id, l.seller_name, l.is_promoted
      INTO item FROM public.swap_listings l WHERE l.id = p_listing_id;
    IF NOT FOUND OR item.seller_auth_id <> actor THEN
        RAISE EXCEPTION 'listing not found' USING ERRCODE = '42501';
    END IF;
    IF item.status <> 'active' THEN
        RAISE EXCEPTION 'only approved listings can be promoted' USING ERRCODE = '22023';
    END IF;
    IF item.is_promoted THEN
        RAISE EXCEPTION 'this listing is already promoted' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.ad_payments a
                WHERE a.listing_id = p_listing_id AND a.status = 'pending') THEN
        RAISE EXCEPTION 'a promotion request for this listing is already awaiting payment' USING ERRCODE = '23505';
    END IF;

    PERFORM public.consume_write_quota(actor, 'request_listing_promotion', 5);

    INSERT INTO public.ad_payments (listing_id, seller_auth_id, seller_name, plan_hours, amount)
    VALUES (p_listing_id, actor, item.seller_name, p_plan_hours, v_amount)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'request_id', v_id, 'amount', v_amount,
        'plan_hours', p_plan_hours, 'status', 'pending'
    );
END;
$$;

-- ── 15. USED INVENTORY BOARD ───────────────────────────────────────────────────
-- Sold units are never handed out: a board that claims "available" stock may
-- only contain units a human actually put on the counter.
CREATE OR REPLACE FUNCTION public.get_used_inventory(p_origin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY u.listed_date DESC, u.name), '[]'::jsonb) INTO result
    FROM public.used_inventory u
    WHERE u.is_sold = false
      AND (p_origin IS NULL OR p_origin NOT IN ('uk','us') OR u.origin = p_origin);
    RETURN result;
END;
$$;

-- ── 16. WHOLESALE ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_wholesale_account(p_business jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor    uuid := auth.uid();
    v_id     text;
    v_status text;
    v_email  text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    IF p_business IS NULL OR length(btrim(coalesce(p_business ->> 'business_name', ''))) < 3 THEN
        RAISE EXCEPTION 'business name is required' USING ERRCODE = '22023';
    END IF;
    IF length(btrim(coalesce(p_business ->> 'contact_name', ''))) < 3 THEN
        RAISE EXCEPTION 'contact name is required' USING ERRCODE = '22023';
    END IF;

    PERFORM public.consume_write_quota(actor, 'apply_wholesale_account', 6);

    SELECT lower(email) INTO v_email FROM auth.users WHERE id = actor;

    INSERT INTO public.wholesale_dealers AS d
        (auth_user_id, business_name, contact_name, phone, email, city, status, updated_at)
    VALUES (
        actor,
        left(btrim(p_business ->> 'business_name'), 90),
        left(btrim(p_business ->> 'contact_name'), 80),
        left(coalesce(p_business ->> 'phone', ''), 20),
        left(coalesce(v_email, lower(btrim(coalesce(p_business ->> 'email', '')))), 120),
        left(coalesce(p_business ->> 'city', ''), 60),
        'pending',
        timezone('utc', now())
    )
    ON CONFLICT (auth_user_id) DO UPDATE
      SET business_name = EXCLUDED.business_name,
          contact_name  = EXCLUDED.contact_name,
          phone         = EXCLUDED.phone,
          city          = EXCLUDED.city,
          -- a rejected applicant may re-apply; an approved dealer keeps access
          status        = CASE WHEN d.status = 'approved' THEN 'approved' ELSE 'pending' END,
          updated_at    = timezone('utc', now())
    RETURNING d.id, d.status INTO v_id, v_status;

    RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_wholesale_account()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor  uuid := auth.uid();
    result jsonb;
BEGIN
    IF actor IS NULL THEN RETURN NULL; END IF;
    SELECT to_jsonb(t) INTO result FROM (
        SELECT id, business_name, contact_name, phone, email, city, status, created_at
        FROM public.wholesale_dealers
        WHERE auth_user_id = actor
    ) t;
    RETURN result;
END;
$$;

-- The one place supplier cost leaves Postgres for these pages: approved dealers
-- only, and the volume tiers are generated here rather than trusted from a file.
CREATE OR REPLACE FUNCTION public.get_wholesale_catalog()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor    uuid := auth.uid();
    v_status text;
    result   jsonb;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    SELECT status INTO v_status FROM public.wholesale_dealers WHERE auth_user_id = actor;
    IF v_status IS DISTINCT FROM 'approved' THEN
        RAISE EXCEPTION 'approved dealer account required' USING ERRCODE = '42501';
    END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category_id', p.category_id,
        'price', round(p.price, 2),
        'wholesale_price', round(p.wholesale_price, 2),
        'stock', p.stock,
        'image_url', p.image_url,
        'storage_options', coalesce(p.storage_options, '[]'::jsonb),
        'tiers', jsonb_build_array(
            jsonb_build_object('min_qty', 1,  'unit_price', round(p.wholesale_price, 2)),
            jsonb_build_object('min_qty', 5,  'unit_price', round(p.wholesale_price * 0.96, 2)),
            jsonb_build_object('min_qty', 10, 'unit_price', round(p.wholesale_price * 0.92, 2)),
            jsonb_build_object('min_qty', 25, 'unit_price', round(p.wholesale_price * 0.87, 2))
        )
    ) ORDER BY p.name), '[]'::jsonb) INTO result
    FROM public.products p
    WHERE p.is_active = true AND p.wholesale_price > 0;

    RETURN result;
END;
$$;

-- Shared pricing core. Quoting and ordering use the same code, so a quote shown
-- to a dealer can never differ from what the order records.
CREATE OR REPLACE FUNCTION public.price_wholesale_items(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    line     record;
    v_name   text;
    v_qty    integer;
    v_base   numeric(12,2);
    v_unit   numeric(12,2);
    v_total  numeric(12,2) := 0;
    v_count  integer := 0;
    v_lines  jsonb := '[]'::jsonb;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN
        RAISE EXCEPTION 'select at least one product' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_items) > 25 THEN
        RAISE EXCEPTION 'an order may hold at most 25 lines' USING ERRCODE = '22023';
    END IF;

    FOR line IN
        SELECT e ->> 'product_id' AS product_id, e ->> 'qty' AS qty
        FROM jsonb_array_elements(p_items) AS e
    LOOP
        v_qty := nullif(line.qty, '')::integer;
        IF v_qty IS NULL OR v_qty < 1 OR v_qty > 500 THEN
            RAISE EXCEPTION 'quantities must be between 1 and 500' USING ERRCODE = '22023';
        END IF;

        SELECT p.name, p.wholesale_price INTO v_name, v_base
          FROM public.products p
         WHERE p.id = line.product_id
           AND p.is_active = true
           AND p.wholesale_price > 0;
        IF v_base IS NULL THEN
            RAISE EXCEPTION 'that product is not available for wholesale' USING ERRCODE = '22023';
        END IF;

        v_unit := round(CASE WHEN v_qty >= 25 THEN v_base * 0.87
                            WHEN v_qty >= 10 THEN v_base * 0.92
                            WHEN v_qty >= 5  THEN v_base * 0.96
                            ELSE v_base END, 2);
        v_total := v_total + v_unit * v_qty;
        v_count := v_count + v_qty;
        v_lines := v_lines || jsonb_build_object(
            'product_id', line.product_id,
            'name', v_name,
            'qty', v_qty,
            'unit_price', v_unit,
            'line_total', round(v_unit * v_qty, 2)
        );
    END LOOP;

    RETURN jsonb_build_object('items', v_lines, 'total', round(v_total, 2), 'unit_count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.price_wholesale_order(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor uuid := auth.uid();
    v_status text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    SELECT status INTO v_status FROM public.wholesale_dealers WHERE auth_user_id = actor;
    IF v_status IS DISTINCT FROM 'approved' THEN
        RAISE EXCEPTION 'approved dealer account required' USING ERRCODE = '42501';
    END IF;
    RETURN public.price_wholesale_items(p_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.place_wholesale_order(p_items jsonb, p_delivery_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor      uuid := auth.uid();
    dealer     record;
    priced     jsonb;
    v_number   text;
    v_id       text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    SELECT * INTO dealer FROM public.wholesale_dealers WHERE auth_user_id = actor;
    IF NOT FOUND OR dealer.status <> 'approved' THEN
        RAISE EXCEPTION 'approved dealer account required' USING ERRCODE = '42501';
    END IF;
    IF btrim(coalesce(p_delivery_address, '')) !~ '^.{8,240}$' THEN
        RAISE EXCEPTION 'a delivery address of 8-240 characters is required' USING ERRCODE = '22023';
    END IF;

    PERFORM public.consume_write_quota(actor, 'place_wholesale_order', 5);

    priced := public.price_wholesale_items(p_items);
    v_number := 'VW-' || to_char(now(), 'YYYYMMDD') || '-' ||
                upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

    INSERT INTO public.wholesale_orders
        (order_number, dealer_id, dealer_name, items, unit_count, subtotal, delivery_fee, total, delivery_address, status)
    VALUES (
        v_number, dealer.id, dealer.business_name, priced -> 'items',
        (priced ->> 'unit_count')::integer, (priced ->> 'total')::numeric, 0,
        (priced ->> 'total')::numeric, btrim(p_delivery_address), 'pending'
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'id', v_id, 'order_number', v_number,
        'total', (priced ->> 'total')::numeric, 'status', 'pending'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_wholesale_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor  uuid := auth.uid();
    result jsonb;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'items', o.items,
        'total', o.total,
        'status', o.status,
        'created_at', o.created_at
    ) ORDER BY o.created_at DESC), '[]'::jsonb) INTO result
    FROM public.wholesale_orders o
    JOIN public.wholesale_dealers d ON d.id = o.dealer_id
    WHERE d.auth_user_id = actor;
    RETURN result;
END;
$$;

-- ── 17. STORE PARTNERS ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_store_partner(p_application jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor   uuid := auth.uid();
    ident   jsonb;
    v_email text;
    v_id    text;
    v_status text;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required — sign in first' USING ERRCODE = '28000';
    END IF;
    IF p_application IS NULL
       OR length(btrim(coalesce(p_application ->> 'shop_name', ''))) < 3
       OR length(btrim(coalesce(p_application ->> 'contact_name', ''))) < 3 THEN
        RAISE EXCEPTION 'shop and contact names are required' USING ERRCODE = '22023';
    END IF;
    IF btrim(coalesce(p_application ->> 'phone', '')) !~ '^0[0-9]{9}$' THEN
        RAISE EXCEPTION 'a Ghana phone number like 0241234567 is required' USING ERRCODE = '22023';
    END IF;

    ident := public.derive_card_identity(actor, p_application ->> 'ghana_card');
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = actor;

    -- One row per account (the INSERT is an upsert), so the budget is about write
    -- churn, not about flooding the table: someone correcting their own
    -- application a few times a day must not be locked out.
    PERFORM public.consume_write_quota(actor, 'apply_store_partner', 6);

    INSERT INTO public.partner_applications AS a (
        auth_user_id, shop_name, contact_name, phone, email, city,
        ghana_card_hash, ghana_card_masked, plan, monthly_volume, about, status, updated_at
    ) VALUES (
        actor,
        left(btrim(p_application ->> 'shop_name'), 90),
        left(btrim(p_application ->> 'contact_name'), 80),
        left(btrim(p_application ->> 'phone'), 20),
        left(coalesce(v_email, ''), 120),
        left(btrim(coalesce(p_application ->> 'city', '')), 80),
        nullif(ident ->> 'hash', ''),
        nullif(ident ->> 'masked', ''),
        CASE WHEN p_application ->> 'plan' IN ('starter','pro','enterprise')
             THEN p_application ->> 'plan' ELSE 'starter' END,
        left(coalesce(p_application ->> 'volume', ''), 40),
        left(btrim(coalesce(p_application ->> 'about', '')), 600),
        'pending',
        timezone('utc', now())
    )
    ON CONFLICT (auth_user_id) DO UPDATE
      SET shop_name      = EXCLUDED.shop_name,
          contact_name   = EXCLUDED.contact_name,
          phone          = EXCLUDED.phone,
          city           = EXCLUDED.city,
          plan           = EXCLUDED.plan,
          monthly_volume = EXCLUDED.monthly_volume,
          about          = EXCLUDED.about,
          status         = CASE WHEN a.status = 'approved' THEN 'approved' ELSE 'pending' END,
          updated_at     = timezone('utc', now())
    RETURNING a.id, a.status INTO v_id, v_status;

    RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_partner_application()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor  uuid := auth.uid();
    result jsonb;
BEGIN
    IF actor IS NULL THEN RETURN NULL; END IF;
    SELECT to_jsonb(t) INTO result FROM (
        SELECT id, shop_name, plan, status, created_at
        FROM public.partner_applications
        WHERE auth_user_id = actor
        ORDER BY created_at DESC
        LIMIT 1
    ) t;
    RETURN result;
END;
$$;

-- ── 18. ADMIN READ MODEL ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_platform_board(p_section text, p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    rows    jsonb;
    summary jsonb;
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;

    summary := jsonb_build_object(
        'pending_listings', (SELECT count(*) FROM public.swap_listings WHERE status = 'pending'),
        'active_listings',  (SELECT count(*) FROM public.swap_listings WHERE status = 'active'),
        'promo_requests',   (SELECT count(*) FROM public.ad_payments WHERE status = 'pending'),
        'used_available',   (SELECT count(*) FROM public.used_inventory WHERE is_sold = false),
        'sellers',          (SELECT count(*) FROM public.sellers),
        'dealers_pending',  (SELECT count(*) FROM public.wholesale_dealers WHERE status = 'pending'),
        'partners_pending', (SELECT count(*) FROM public.partner_applications WHERE status = 'pending'),
        'ad_revenue',       (SELECT coalesce(sum(amount), 0) FROM public.ad_payments WHERE status = 'completed')
    );

    rows := CASE p_section
      WHEN 'dashboard' THEN (
        SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC), '[]'::jsonb)
        FROM (SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT 20) l)
      WHEN 'swap' THEN (
        SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.pending_first DESC, x.created_at DESC), '[]'::jsonb)
        FROM (
          SELECT id, seller_name, seller_phone, city, brand, model, storage, grade, price, want,
                 listing_type, status, is_promoted, created_at, (status = 'pending') AS pending_first
          FROM public.swap_listings
          ORDER BY (status = 'pending') DESC, created_at DESC
          LIMIT v_limit
        ) x)
      WHEN 'ads' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', a.id, 'listing_id', a.listing_id, 'listing_model', l.model,
          'seller_name', a.seller_name, 'plan_hours', a.plan_hours, 'amount', a.amount,
          'status', a.status, 'created_at', a.created_at
        ) ORDER BY a.created_at DESC), '[]'::jsonb)
        FROM public.ad_payments a
        LEFT JOIN public.swap_listings l ON l.id = a.listing_id
        WHERE a.status IN ('pending','completed'))
      WHEN 'used' THEN (
        SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY u.is_sold, u.listed_date DESC, u.name), '[]'::jsonb)
        FROM (
          SELECT id, origin, brand, name, storage, color, grade, battery_health,
                 price, was_price, is_sold, listed_date
          FROM public.used_inventory
          ORDER BY is_sold, listed_date DESC, name
          LIMIT v_limit
        ) u)
      -- Only the masked card hint crosses the wire, never the number.
      WHEN 'sellers' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', s.id, 'name', s.display_name, 'email', u.email, 'phone', s.phone, 'city', s.city,
          'ghana_card_masked', s.ghana_card_masked, 'ghana_card_verified', s.ghana_card_verified,
          'face_verified', s.face_verified, 'is_banned', s.is_banned, 'created_at', s.created_at,
          'listings', (SELECT count(*) FROM public.swap_listings l WHERE l.seller_auth_id = s.auth_user_id)
        ) ORDER BY s.created_at DESC), '[]'::jsonb)
        FROM public.sellers s
        LEFT JOIN auth.users u ON u.id = s.auth_user_id
        LIMIT v_limit)
      WHEN 'dealers' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', d.id, 'business_name', d.business_name, 'contact_name', d.contact_name,
          'phone', d.phone, 'email', d.email, 'city', d.city, 'status', d.status, 'created_at', d.created_at
        ) ORDER BY d.created_at DESC), '[]'::jsonb)
        FROM public.wholesale_dealers d LIMIT v_limit)
      WHEN 'orders' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', o.id, 'order_number', o.order_number, 'dealer_name', o.dealer_name,
          'items', o.items, 'unit_count', o.unit_count, 'total', o.total,
          'status', o.status, 'created_at', o.created_at
        ) ORDER BY o.created_at DESC), '[]'::jsonb)
        FROM public.wholesale_orders o LIMIT v_limit)
      WHEN 'partners' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', a.id, 'shop_name', a.shop_name, 'contact_name', a.contact_name,
          'phone', a.phone, 'city', a.city, 'plan', a.plan, 'status', a.status,
          'about', a.about, 'created_at', a.created_at
        ) ORDER BY a.created_at DESC), '[]'::jsonb)
        FROM public.partner_applications a LIMIT v_limit)
      WHEN 'logs' THEN (
        SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC), '[]'::jsonb)
        FROM (SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT v_limit) l)
      ELSE '[]'::jsonb
    END;

    RETURN jsonb_build_object('rows', coalesce(rows, '[]'::jsonb), 'summary', summary, 'section', p_section);
END;
$$;

-- ── 19. ADMIN ACTIONS ──────────────────────────────────────────────────────────
-- Each one re-checks the allowlist and writes its own audit row, so the console
-- page cannot forget to log, and a shopper cannot call these directly.
CREATE OR REPLACE FUNCTION public.admin_set_listing_status(p_listing_id text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('active','rejected','removed') THEN
        RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
    END IF;

    UPDATE public.swap_listings
       SET status = p_status,
           is_promoted = CASE WHEN p_status = 'active' THEN is_promoted ELSE false END,
           promo_expires_at = CASE WHEN p_status = 'active' THEN promo_expires_at ELSE NULL END,
           updated_at = timezone('utc', now())
     WHERE id = p_listing_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'listing not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'listing_' || p_status,
            jsonb_build_object('listing_id', v_id));

    RETURN jsonb_build_object('id', v_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_promotion(p_payment_id text, p_decision text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    pay      record;
    v_status text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    IF p_decision NOT IN ('activate','decline','stop') THEN
        RAISE EXCEPTION 'unsupported decision' USING ERRCODE = '22023';
    END IF;

    SELECT a.id, a.listing_id, a.status AS payment_status, a.plan_hours
      INTO pay
      FROM public.ad_payments a WHERE a.id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'promotion request not found' USING ERRCODE = '22023';
    END IF;

    IF p_decision = 'activate' THEN
        IF pay.payment_status = 'completed' THEN
            RAISE EXCEPTION 'this promotion is already active' USING ERRCODE = '22023';
        END IF;
        UPDATE public.ad_payments
           SET status = 'completed', approved_at = timezone('utc', now()),
               payment_method = coalesce(payment_method, 'manual')
         WHERE id = p_payment_id;
        UPDATE public.swap_listings
           SET is_promoted = true,
               promo_expires_at = timezone('utc', now()) + make_interval(hours => pay.plan_hours),
               updated_at = timezone('utc', now())
         WHERE id = pay.listing_id;
        v_status := 'completed';
    ELSIF p_decision = 'decline' THEN
        UPDATE public.ad_payments SET status = 'failed' WHERE id = p_payment_id;
        v_status := 'failed';
    ELSE
        UPDATE public.ad_payments SET status = 'refunded' WHERE id = p_payment_id;
        UPDATE public.swap_listings
           SET is_promoted = false, promo_expires_at = NULL, updated_at = timezone('utc', now())
         WHERE id = pay.listing_id;
        v_status := 'refunded';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'promo_' || p_decision,
            jsonb_build_object('payment_id', p_payment_id, 'listing_id', pay.listing_id,
                               'hours', pay.plan_hours));

    RETURN jsonb_build_object('status', v_status, 'listing_id', pay.listing_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_used(p_used_id text, p_action text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;

    IF p_action = 'sold' THEN
        UPDATE public.used_inventory
           SET is_sold = true, sold_at = timezone('utc', now()), updated_at = timezone('utc', now())
         WHERE id = p_used_id RETURNING id INTO v_id;
    ELSIF p_action = 'restock' THEN
        UPDATE public.used_inventory
           SET is_sold = false, sold_at = NULL, listed_date = current_date, updated_at = timezone('utc', now())
         WHERE id = p_used_id RETURNING id INTO v_id;
    ELSIF p_action = 'delete' THEN
        DELETE FROM public.used_inventory WHERE id = p_used_id RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'unsupported action' USING ERRCODE = '22023';
    END IF;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'used inventory row not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'used_' || p_action, jsonb_build_object('id', v_id));

    RETURN jsonb_build_object('id', v_id, 'action', p_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_used(p_item jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_images jsonb := '[]'::jsonb;
    v_id     text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    IF p_item IS NULL OR length(btrim(coalesce(p_item ->> 'name', ''))) < 4 THEN
        RAISE EXCEPTION 'a unit name is required' USING ERRCODE = '22023';
    END IF;
    IF coalesce(nullif(p_item ->> 'price', '')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION 'a positive price is required' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(jsonb_agg(url), '[]'::jsonb) INTO v_images
    FROM (
        SELECT url FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(p_item -> 'images') = 'array'
                 THEN p_item -> 'images' ELSE '[]'::jsonb END
        ) AS url
        WHERE url ~ '^uploads/[A-Za-z0-9._-]+\.png$'
           OR url ~* '^https://images\.unsplash\.com/'
           OR url ~* '^https://eydsoqnpetqczaeqrscc\.supabase\.co/'
           OR url ~* '^https://valmontgadgets\.com/'
        LIMIT 6
    ) kept;

    INSERT INTO public.used_inventory (
        origin, brand, name, storage, color, grade, battery_health, price, was_price,
        screen_condition, body_condition, charger_included, images, listed_date
    ) VALUES (
        CASE WHEN p_item ->> 'origin' = 'us' THEN 'us' ELSE 'uk' END,
        left(btrim(coalesce(p_item ->> 'brand', 'apple')), 40),
        left(btrim(p_item ->> 'name'), 90),
        left(coalesce(p_item ->> 'storage', ''), 20),
        left(coalesce(p_item ->> 'color', ''), 40),
        nullif(upper(coalesce(p_item ->> 'grade', '')), ''),
        nullif(p_item ->> 'battery', '')::int,
        (p_item ->> 'price')::numeric,
        nullif(p_item ->> 'was_price', '')::numeric,
        left(coalesce(p_item ->> 'screen', ''), 90),
        left(coalesce(p_item ->> 'body', ''), 90),
        left(coalesce(p_item ->> 'charger', ''), 90),
        v_images,
        current_date
    )
    RETURNING id INTO v_id;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'used_created',
            jsonb_build_object('id', v_id, 'name', p_item ->> 'name'));

    RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_seller(p_seller_id text, p_action text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor uuid;
    v_id    text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;

    IF p_action = 'verify' THEN
        UPDATE public.sellers
           SET face_verified = true, ghana_card_verified = true, updated_at = timezone('utc', now())
         WHERE id = p_seller_id RETURNING auth_user_id, id INTO v_actor, v_id;
    ELSIF p_action = 'ban' THEN
        UPDATE public.sellers
           SET is_banned = true,
               ban_reason = left(btrim(coalesce(p_reason, 'policy violation')), 200),
               updated_at = timezone('utc', now())
         WHERE id = p_seller_id RETURNING auth_user_id, id INTO v_actor, v_id;
        UPDATE public.swap_listings
           SET status = 'removed', is_promoted = false, promo_expires_at = NULL, updated_at = timezone('utc', now())
         WHERE seller_auth_id = v_actor AND status IN ('pending','active');
        UPDATE public.ad_payments
           SET status = 'failed'
         WHERE listing_id IN (SELECT id FROM public.swap_listings WHERE seller_auth_id = v_actor)
           AND status = 'pending';
    ELSIF p_action = 'unban' THEN
        UPDATE public.sellers
           SET is_banned = false, ban_reason = NULL, updated_at = timezone('utc', now())
         WHERE id = p_seller_id RETURNING auth_user_id, id INTO v_actor, v_id;
    ELSE
        RAISE EXCEPTION 'unsupported action' USING ERRCODE = '22023';
    END IF;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'seller not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'seller_' || p_action,
            jsonb_build_object('seller_id', v_id, 'reason', p_reason));

    RETURN jsonb_build_object('id', v_id, 'action', p_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_dealer_status(p_dealer_id text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('approved','rejected','pending') THEN
        RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
    END IF;

    UPDATE public.wholesale_dealers
       SET status = p_status,
           reviewed_by = coalesce(auth.jwt() ->> 'email', 'admin'),
           reviewed_at = timezone('utc', now()),
           updated_at = timezone('utc', now())
     WHERE id = p_dealer_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'dealer not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'dealer_' || p_status,
            jsonb_build_object('dealer_id', v_id));

    RETURN jsonb_build_object('id', v_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_order_id text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('pending','processing','shipped','delivered','cancelled') THEN
        RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
    END IF;

    UPDATE public.wholesale_orders
       SET status = p_status, updated_at = timezone('utc', now())
     WHERE id = p_order_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'order not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'order_' || p_status,
            jsonb_build_object('order_id', v_id));

    RETURN jsonb_build_object('id', v_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_partner_status(p_partner_id text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id text;
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('approved','rejected','pending') THEN
        RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
    END IF;

    UPDATE public.partner_applications
       SET status = p_status, updated_at = timezone('utc', now())
     WHERE id = p_partner_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'application not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), 'partner_' || p_status,
            jsonb_build_object('application_id', v_id));

    RETURN jsonb_build_object('id', v_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_note(p_action text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.admin_audit_log (admin_user, action, details)
    VALUES (coalesce(auth.jwt() ->> 'email', 'admin'), left(btrim(p_action), 60),
            coalesce(p_details, '{}'::jsonb));
END;
$$;

-- ── 20. ADMIN DISPATCH (the single entry point the console calls) ─────────────
-- The browser posts { name, params } to admin(); a fixed allowlist maps each
-- name onto a guarded procedure. Nothing here can be reached by an unverified
-- session (private_execute() checks is_valmont_admin() again inside the same
-- transaction), and no admin name can be smuggled in as an arbitrary call.
CREATE OR REPLACE FUNCTION public.admin_private_execute(p_name text, p_params jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    listing  text := p_params ->> 'p_listing_id';
    payment  text := p_params ->> 'p_payment_id';
    used     text := p_params ->> 'p_used_id';
    seller   text := p_params ->> 'p_seller_id';
    dealer   text := p_params ->> 'p_dealer_id';
    ord      text := p_params ->> 'p_order_id';
    partner  text := p_params ->> 'p_partner_id';
    reason   text := p_params ->> 'p_reason';
    status   text := p_params ->> 'p_status';
    decision text := p_params ->> 'p_decision';
BEGIN
    IF NOT public.is_valmont_admin() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;

    CASE p_name
      WHEN 'approve_listing' THEN PERFORM public.admin_set_listing_status(listing, 'active');
      WHEN 'reject_listing'  THEN PERFORM public.admin_set_listing_status(listing, 'rejected');
      WHEN 'remove_listing'  THEN PERFORM public.admin_set_listing_status(listing, 'removed');
      WHEN 'activate_promo'  THEN PERFORM public.admin_set_promotion(payment, coalesce(decision, 'activate'));
      WHEN 'decline_promo'   THEN PERFORM public.admin_set_promotion(payment, 'decline');
      WHEN 'stop_promo'      THEN PERFORM public.admin_set_promotion(payment, 'stop');
      WHEN 'sold_used'       THEN PERFORM public.admin_set_used(used, 'sold');
      WHEN 'restock_used'    THEN PERFORM public.admin_set_used(used, 'restock');
      WHEN 'delete_used'     THEN PERFORM public.admin_set_used(used, 'delete');
      WHEN 'upsert_used'     THEN PERFORM public.admin_upsert_used(p_params -> 'p_item');
      WHEN 'verify_seller'   THEN PERFORM public.admin_set_seller(seller, 'verify');
      WHEN 'ban_seller'      THEN PERFORM public.admin_set_seller(seller, 'ban', reason);
      WHEN 'unban_seller'    THEN PERFORM public.admin_set_seller(seller, 'unban');
      WHEN 'approve_dealer'  THEN PERFORM public.admin_set_dealer_status(dealer, 'approved');
      WHEN 'reject_dealer'   THEN PERFORM public.admin_set_dealer_status(dealer, 'rejected');
      WHEN 'revoke_dealer'   THEN PERFORM public.admin_set_dealer_status(dealer, 'pending');
      WHEN 'set_order_status' THEN PERFORM public.admin_set_order_status(ord, status);
      WHEN 'approve_partner' THEN PERFORM public.admin_set_partner_status(partner, 'approved');
      WHEN 'reject_partner'  THEN PERFORM public.admin_set_partner_status(partner, 'rejected');
      ELSE RAISE EXCEPTION 'unsupported admin action' USING ERRCODE = '22023';
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin(p_name text, p_params jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_name IS NULL OR p_name !~ '^[a-z][a-z0-9_]{2,40}$' THEN
        RAISE EXCEPTION 'unsupported admin action' USING ERRCODE = '22023';
    END IF;
    PERFORM public.admin_private_execute(p_name, coalesce(p_params, '{}'::jsonb));
    RETURN jsonb_build_object('ok', true, 'action', p_name);
END;
$$;

-- ── 21. ROW LEVEL SECURITY ───────────────────────────────────────────────────
ALTER TABLE public.sellers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_dealers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.write_quota          ENABLE ROW LEVEL SECURITY;

-- Only approved listings are public, and only their public columns (the
-- SECURITY DEFINER functions above bypass RLS deliberately; table-level grants
-- below decide what PostgREST may read directly).
DROP POLICY IF EXISTS "Public reads approved swap listings" ON public.swap_listings;
CREATE POLICY "Public reads approved swap listings" ON public.swap_listings
    FOR SELECT TO anon, authenticated
    USING (status = 'active');

-- Approved used stock is public; sold units are not.
DROP POLICY IF EXISTS "Public reads available used stock" ON public.used_inventory;
CREATE POLICY "Public reads available used stock" ON public.used_inventory
    FOR SELECT TO anon, authenticated
    USING (is_sold = false);

-- A seller may read their own listings and the leads on them. Writes still go
-- through the RPCs so pricing, status and quotas stay authoritative.
DROP POLICY IF EXISTS "Seller reads own listings" ON public.swap_listings;
CREATE POLICY "Seller reads own listings" ON public.swap_listings
    FOR SELECT TO authenticated
    USING (seller_auth_id = auth.uid());

DROP POLICY IF EXISTS "Seller reads own leads" ON public.swap_leads;
CREATE POLICY "Seller reads own leads" ON public.swap_leads
    FOR SELECT TO authenticated
    USING (seller_auth_id = auth.uid());

DROP POLICY IF EXISTS "Seller reads own profile" ON public.sellers;
CREATE POLICY "Seller reads own profile" ON public.sellers
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

-- Allowlisted admin: full table access for operational fixes that do not have
-- a dedicated RPC (still narrower than the old "authenticated" policies).
DROP POLICY IF EXISTS "Admin full access sellers" ON public.sellers;
CREATE POLICY "Admin full access sellers" ON public.sellers
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin full access swap listings" ON public.swap_listings;
CREATE POLICY "Admin full access swap listings" ON public.swap_listings
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin full access swap leads" ON public.swap_leads;
CREATE POLICY "Admin full access swap leads" ON public.swap_leads
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin full access used inventory" ON public.used_inventory;
CREATE POLICY "Admin full access used inventory" ON public.used_inventory
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin full access wholesale dealers" ON public.wholesale_dealers;
CREATE POLICY "Admin full access wholesale dealers" ON public.wholesale_dealers
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Dealer reads own wholesale account" ON public.wholesale_dealers;
CREATE POLICY "Dealer reads own wholesale account" ON public.wholesale_dealers
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin full access wholesale orders" ON public.wholesale_orders;
CREATE POLICY "Admin full access wholesale orders" ON public.wholesale_orders
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Admin full access partner applications" ON public.partner_applications;
CREATE POLICY "Admin full access partner applications" ON public.partner_applications
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Partner reads own application" ON public.partner_applications;
CREATE POLICY "Partner reads own application" ON public.partner_applications
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin full access ad payments" ON public.ad_payments;
CREATE POLICY "Admin full access ad payments" ON public.ad_payments
    FOR ALL TO authenticated
    USING (public.is_valmont_admin()) WITH CHECK (public.is_valmont_admin());

DROP POLICY IF EXISTS "Seller reads own promotions" ON public.ad_payments;
CREATE POLICY "Seller reads own promotions" ON public.ad_payments
    FOR SELECT TO authenticated
    USING (seller_auth_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads audit log" ON public.admin_audit_log;
CREATE POLICY "Admin reads audit log" ON public.admin_audit_log
    FOR SELECT TO authenticated
    USING (public.is_valmont_admin());

DROP POLICY IF EXISTS "Owner reads own quota" ON public.write_quota;
CREATE POLICY "Owner reads own quota" ON public.write_quota
    FOR SELECT TO authenticated
    USING (actor_auth_id = auth.uid());

-- ── 22. PRIVILEGES ─────────────────────────────────────────────────────────────
-- Start from zero, then add exactly what each role needs.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'sellers','swap_listings','swap_leads','used_inventory','wholesale_dealers',
        'wholesale_orders','partner_applications','ad_payments','admin_audit_log','write_quota'
    ] LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    END LOOP;
END;
$$;

GRANT SELECT ON public.swap_listings TO anon;
GRANT SELECT ON public.used_inventory TO anon;
GRANT SELECT ON public.swap_listings, public.swap_leads, public.used_inventory,
             public.sellers, public.ad_payments TO authenticated;

DO $$
DECLARE
    p regprocedure;
    name_list text[] := ARRAY[
        'consume_write_quota','derive_card_identity','identity_pepper','save_seller_profile',
        'get_my_seller_profile','create_swap_listing','get_my_swap_listings','get_my_swap_leads',
        'update_swap_listing_status','record_listing_view','create_swap_lead','request_listing_promotion',
        'get_used_inventory','apply_wholesale_account','get_my_wholesale_account','get_wholesale_catalog',
        'price_wholesale_items','price_wholesale_order','place_wholesale_order','get_my_wholesale_orders',
        'apply_store_partner','get_my_partner_application','admin_platform_board','admin_private_execute',
        'admin','admin_note','admin_set_listing_status','admin_set_promotion','admin_set_used',
        'admin_upsert_used','admin_set_seller','admin_set_dealer_status','admin_set_order_status',
        'admin_set_partner_status'
    ];
BEGIN
    -- Start from zero for every function in this migration. Supabase grants
    -- EXECUTE on public functions to PUBLIC by default, so a function that is
    -- merely "not granted" below is still callable by an anonymous visitor.
    FOR p IN
        SELECT pr.oid::regprocedure
        FROM pg_proc pr JOIN pg_namespace n ON n.oid = pr.pronamespace
        WHERE n.nspname = 'public' AND pr.proname = ANY (name_list)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', p);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', p);
    END LOOP;

    IF array_length(name_list, 1) <> (
        SELECT count(*) FROM pg_proc pr JOIN pg_namespace n ON n.oid = pr.pronamespace
        WHERE n.nspname = 'public'
          AND pr.proname = ANY (name_list)
          AND pr.proname NOT IN ('is_valmont_admin')
    ) THEN
        RAISE EXCEPTION 'a platform function in the privilege list does not exist' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- Shopper-facing functions (anon may call them; they fail closed without a JWT).
GRANT EXECUTE ON FUNCTION public.get_used_inventory(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_seller_profile(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_seller_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_swap_listing(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_swap_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_swap_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_swap_listing_status(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_listing_view(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_swap_lead(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_listing_promotion(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_wholesale_account(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_wholesale_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wholesale_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.price_wholesale_order(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_wholesale_order(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_wholesale_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_store_partner(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_partner_application() TO authenticated;

-- Admin-only functions. The console gets exactly one entry point plus the board.
GRANT EXECUTE ON FUNCTION public.admin_platform_board(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_note(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_status(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_promotion(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_used(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_used(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_seller(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_dealer_status(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_partner_status(text,text) TO authenticated;

-- The internal helpers (price_wholesale_items, consume_write_quota,
-- derive_card_identity, identity_pepper, admin_private_execute) keep the
-- revocations applied by the sweep above: they are reachable only from the
-- guarded functions that call them.
REVOKE ALL ON FUNCTION public.derive_card_identity(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.identity_pepper() FROM PUBLIC, anon, authenticated;

-- ── 23. POST-CONDITIONS ───────────────────────────────────────────────────────
-- Fail closed rather than ship an open door: a function that can read or write
-- a platform table must either be on the reviewed anonymous allowlist or be
-- uncallable by anon. This catches a later ALTER that adds a helper without
-- touching the privilege sweep above.
DO $$
DECLARE
    bad text;
BEGIN
    SELECT string_agg(x.proname, ', ' ORDER BY x.proname) INTO bad
    FROM (
        SELECT pr.proname
        FROM pg_proc pr
        JOIN pg_namespace n ON n.oid = pr.pronamespace
        WHERE n.nspname = 'public'
          AND (
                pr.prosrc ~ 'public\.(sellers|swap_listings|swap_leads|used_inventory|wholesale_dealers|wholesale_orders|partner_applications|ad_payments|admin_audit_log|write_quota)'
             OR pr.prosrc ~ 'public\.(admin_upsert_used|admin_set_promotion|admin_private_execute)'
          )
          AND pr.proname NOT IN ('get_used_inventory','record_listing_view','is_valmont_admin')
          AND has_function_privilege('anon', pr.oid, 'EXECUTE')
    ) x;

    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'these platform functions are still executable by anon: %', bad
          USING ERRCODE = '42501';
    END IF;

    -- The board and the console entry point must never be anonymous-callable,
    -- even though the admin predicate would refuse them.
    IF has_function_privilege('anon', 'public.admin(text,jsonb)'::regprocedure, 'EXECUTE') THEN
        RAISE EXCEPTION 'public.admin() must not be executable by anon' USING ERRCODE = '42501';
    END IF;
    IF has_function_privilege('anon', 'public.admin_platform_board(text,integer)'::regprocedure, 'EXECUTE') THEN
        RAISE EXCEPTION 'public.admin_platform_board() must not be executable by anon' USING ERRCODE = '42501';
    END IF;
END;
$$;

-- ── 24. WHAT IS DELIBERATELY NOT HERE ─────────────────────────────────────────
-- * No policy lets an anonymous or self-registered shopper INSERT or UPDATE any
--   of these tables. Sign-up in this project is open to any customer, so
--   "authenticated" is not an authorisation tier (see 20260811_admin_email_allowlist.sql).
-- * No promotion is ever marked paid or active by a browser call; the only path
--   is admin_set_promotion, which re-checks public.is_valmont_admin().
-- * No column on this list stores a password or a raw Ghana Card number.
