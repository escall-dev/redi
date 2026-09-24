-- ==============================================================================
-- Migration: 20260924000003_partner_discovery_rls.sql
-- Description: Enables authenticated users to discover partners by username
--              while keeping all sensitive personal cycle & account data private.
-- Phase: 19 Batch 2 Fix
-- ==============================================================================

-- 1. Add SELECT policy on public.profiles for authenticated users searching by username
-- This allows authenticated users to find other users who have a public username configured
DROP POLICY IF EXISTS "Authenticated users can search public profiles by username" ON public.profiles;
CREATE POLICY "Authenticated users can search public profiles by username"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (username IS NOT NULL);

-- 2. Safe RPC: search_partner_by_username
-- Returns ONLY public discovery metadata (username, display_name)
-- Strictly never returns auth user ID, internal UUID, email, cycles, or notes
CREATE OR REPLACE FUNCTION public.search_partner_by_username(
  p_query TEXT,
  p_current_user_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  username TEXT,
  display_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username, p.display_name
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND p.user_id <> p_current_user_id
    AND LOWER(p.username) LIKE LOWER(p_query) || '%'
  ORDER BY p.username ASC
  LIMIT LEAST(p_limit, 10);
$$;

-- 3. Safe RPC: resolve_partner_by_username
-- Resolves target partner for invitation binding server-side
CREATE OR REPLACE FUNCTION public.resolve_partner_by_username(
  p_username TEXT
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND LOWER(p.username) = LOWER(p_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.search_partner_by_username(TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_partner_by_username(TEXT) TO authenticated;
