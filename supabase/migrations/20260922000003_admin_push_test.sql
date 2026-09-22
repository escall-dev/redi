-- Seijun Phase 17.9: Administrative Push Test Functions
-- Provides secure, server-side functions for the development/admin global test broadcast
-- and expired subscription cleanup without requiring service_role key.

-- ==============================================================================
-- 1. ADMIN FUNCTION: Retrieve all subscriptions for global test broadcast
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_all_push_subscriptions_for_admin_test()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth, ps.created_at, ps.updated_at
  FROM public.push_subscriptions ps;
END;
$$;

-- ==============================================================================
-- 2. ADMIN FUNCTION: Clean up expired subscription by exact ID
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_expired_push_subscription_admin(target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.push_subscriptions WHERE id = target_id;
  RETURN FOUND;
END;
$$;

-- ==============================================================================
-- 3. PERMISSIONS: Explicit Execution Restrictions
-- ==============================================================================

-- Revoke default PUBLIC and anon execution to prevent unauthenticated RPC invocation via PostgREST
REVOKE ALL ON FUNCTION public.get_all_push_subscriptions_for_admin_test() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_push_subscriptions_for_admin_test() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_expired_push_subscription_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_expired_push_subscription_admin(UUID) TO authenticated, service_role;

