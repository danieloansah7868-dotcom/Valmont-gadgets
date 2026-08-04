-- ============================================================
-- Valmont Gadgets — Daily Drop account ownership
--
-- This migration is recorded here for deployments. It has already
-- been applied to the production Supabase project; do not re-run it
-- manually as part of the Daily Drop frontend rollout.
-- ============================================================

ALTER TABLE public.drop_flips
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_email TEXT;

-- A signed-in account and a WhatsApp number may each earn only one
-- flip for a drop day. Existing legacy rows with NULL account_id do
-- not collide with the account index.
CREATE UNIQUE INDEX IF NOT EXISTS drop_flips_account_day
  ON public.drop_flips (account_id, drop_date);

CREATE UNIQUE INDEX IF NOT EXISTS drop_flips_phone_day
  ON public.drop_flips (whatsapp, drop_date);
