-- ============================================================
-- Valmont Gadgets — Daily Drop ("Flip the Card")
-- Stores every flip + captured WhatsApp lead.
-- ============================================================

CREATE TABLE IF NOT EXISTS drop_flips (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    drop_date     DATE NOT NULL DEFAULT (timezone('utc', now())::date),
    device_id     TEXT NOT NULL,              -- random uuid stored in localStorage
    whatsapp      TEXT NOT NULL,              -- normalised 233XXXXXXXXX
    prize_tier    TEXT NOT NULL,              -- common | good | golden
    prize_label   TEXT NOT NULL,              -- human readable reward
    prize_code    TEXT NOT NULL,              -- coupon code shown to customer
    product_id    TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name  TEXT,
    claimed       BOOLEAN DEFAULT false,      -- admin marks true when honoured
    created_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- one flip per device per day
CREATE UNIQUE INDEX IF NOT EXISTS drop_flips_device_day
    ON drop_flips (device_id, drop_date);

CREATE INDEX IF NOT EXISTS drop_flips_date_idx ON drop_flips (drop_date DESC);
CREATE INDEX IF NOT EXISTS drop_flips_wa_idx   ON drop_flips (whatsapp);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE drop_flips ENABLE ROW LEVEL SECURITY;

-- anyone may record their own flip
DROP POLICY IF EXISTS drop_flips_public_insert ON drop_flips;
CREATE POLICY drop_flips_public_insert ON drop_flips
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- nobody anonymous may read the lead list (admin uses service role / authed)
DROP POLICY IF EXISTS drop_flips_admin_read ON drop_flips;
CREATE POLICY drop_flips_admin_read ON drop_flips
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS drop_flips_admin_update ON drop_flips;
CREATE POLICY drop_flips_admin_update ON drop_flips
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- ── Public counter (how many flipped today) without exposing leads ──
CREATE OR REPLACE VIEW drop_stats AS
SELECT drop_date,
       count(*)::int                                        AS flips,
       count(*) FILTER (WHERE prize_tier = 'golden')::int    AS golden_hits
FROM drop_flips
GROUP BY drop_date;

GRANT SELECT ON drop_stats TO anon, authenticated;
