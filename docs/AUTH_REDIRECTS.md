# Supabase authentication redirect URLs

The production Supabase project must allow every URL that receives an authentication callback.
These settings are managed in **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs** and are not deployed by this repository.

Required production entries:

- `https://valmontgadgets.com/admin-login.html` — admin password recovery
- `https://valmontgadgets.com/account.html` — customer password recovery

The customer reset request is available from both `index.html` and `account.html`. Both send the shopper to `account.html`, which owns the set-new-password form and consumes the recovery access token.

If local Supabase development is introduced later, mirror these entries in `supabase/config.toml` using local callback origins. Do not treat local CLI config as a replacement for the hosted project's dashboard allowlist.
