-- Owner runs this AFTER the new checkout is verified live.
-- Revoke the legacy 8-arg overload so only the 9-arg p_delivery_region RPC remains callable.
revoke all on function public.create_pending_order(text,text,jsonb,numeric,numeric,numeric,text,text) from public, anon, authenticated;
