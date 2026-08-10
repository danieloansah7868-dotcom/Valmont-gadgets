-- ==============================================================================
-- Valmont Gadgets — SMS Lead Collection (SMS Marketing popup + admin export)
--
-- The storefront popup (assets/js/storefront.js) collects Ghana mobile numbers
-- and POSTs them to /api/account/optin (a Vercel Edge function). This table
-- stores every opted-in number, detects the mobile network, records the
-- collection source, and is read back through the admin "SMS Leads" tab
-- (GET /api/admin/sms-leads).
--
--   * phone  — local Ghana format 0XXXXXXXXX (UNIQUE + ^0[0-9]{9}$ CHECK)
--   * RLS is enabled; anon can only INSERT (public opt-in), never SELECT
--     (leads are private — only authenticated/admin can read them).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sms_leads (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone      TEXT NOT NULL UNIQUE,
    network    TEXT,                                   -- MTN | Telecel | AirtelTigo
    source     TEXT,                                   -- storefront | checkout | campaign-<slug>
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT sms_leads_phone_format CHECK (phone ~ '^0[0-9]{9}$')
);

-- Lookups are newest-first in the admin panel.
CREATE INDEX IF NOT EXISTS sms_leads_created_idx ON public.sms_leads (created_at DESC);
-- Fast duplicate detection on opt-in.
CREATE INDEX IF NOT EXISTS sms_leads_phone_idx ON public.sms_leads (phone);

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.sms_leads ENABLE ROW LEVEL SECURITY;

-- Public opt-in may INSERT (the /api/account/optin endpoint runs with the
-- anon key). Mirrors the existing drop_flips policy style.
DROP POLICY IF EXISTS sms_leads_public_insert ON public.sms_leads;
CREATE POLICY sms_leads_public_insert ON public.sms_leads
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Leads are PRIVATE: only authenticated (admin) may read. anon has no SELECT
-- policy, so the collected phone numbers are never publicly listable.
DROP POLICY IF EXISTS sms_leads_admin_select ON public.sms_leads;
CREATE POLICY sms_leads_admin_select ON public.sms_leads
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS sms_leads_admin_update ON public.sms_leads;
CREATE POLICY sms_leads_admin_update ON public.sms_leads
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sms_leads_admin_delete ON public.sms_leads;
CREATE POLICY sms_leads_admin_delete ON public.sms_leads
    FOR DELETE TO authenticated
    USING (true);

-- ── Revoke anon read access explicitly (belt & suspenders) ───────────────────
REVOKE SELECT ON TABLE public.sms_leads FROM anon, public;
GRANT SELECT ON TABLE public.sms_leads TO authenticated, service_role;
GRANT INSERT ON TABLE public.sms_leads TO anon, authenticated, service_role;
GRANT UPDATE, DELETE ON TABLE public.sms_leads TO authenticated, service_role;
