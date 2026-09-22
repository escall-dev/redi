-- Seijun Phase 17.5: Push Subscriptions Row Level Security (RLS)
-- Establishes strict owner-only access policies for public.push_subscriptions.

-- ==============================================================================
-- 1. ROW LEVEL SECURITY STATUS
-- ==============================================================================

-- Ensure Row Level Security remains active
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. POLICIES (AUTHENTICATED USER ISOLATION)
-- ==============================================================================

-- 2.1 SELECT: Authenticated users can only view their own push subscriptions
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 2.2 INSERT: Authenticated users can only insert push subscriptions for themselves
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2.3 UPDATE: Authenticated users can only update their own push subscriptions,
-- and cannot change ownership to another user (protected by both USING and WITH CHECK)
DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2.4 DELETE: Authenticated users can only delete their own push subscriptions
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
