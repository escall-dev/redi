-- Seijun Phase 17.4: Push Subscription Database Schema
-- Creates public.push_subscriptions for storing Web Push endpoint and crypto credentials.
-- Policies (SELECT, INSERT, UPDATE, DELETE) are intentionally omitted in this phase and reserved for Phase 17.5.

-- ==============================================================================
-- 1. TABLE: push_subscriptions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_push_subscription_endpoint UNIQUE (endpoint)
);

-- ==============================================================================
-- 2. TRIGGER: updated_at
-- ==============================================================================

DROP TRIGGER IF EXISTS set_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS to ensure table is secure by default.
-- Strict boundary: NO policies (SELECT, INSERT, UPDATE, DELETE) are created in Phase 17.4.
-- All RLS policies are reserved for Phase 17.5.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
