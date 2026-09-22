-- Seijun Phase 17.11: Notification Preferences Database Schema & RLS
-- Creates public.notification_preferences for storing user-owned notification category preferences.
-- Default: All categories default to TRUE.
-- Missing rows are safely resolved to defaults by the server layer.
-- RLS: Authenticated users can SELECT, INSERT, and UPDATE only their own preferences.
-- DELETE: Intentionally restricted to prevent accidental destruction of user preferences.

-- ==============================================================================
-- 1. TABLE: notification_preferences
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  personal_updates BOOLEAN NOT NULL DEFAULT TRUE,
  partner_daily_notes BOOLEAN NOT NULL DEFAULT TRUE,
  partner_cycle_updates BOOLEAN NOT NULL DEFAULT TRUE,
  partner_activity BOOLEAN NOT NULL DEFAULT TRUE,
  partner_connection BOOLEAN NOT NULL DEFAULT TRUE,
  shared_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  shared_updates BOOLEAN NOT NULL DEFAULT TRUE,
  system_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  security_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. TRIGGER: updated_at
-- ==============================================================================

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================

-- user_id is already indexed as the PRIMARY KEY.

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT: Authenticated users can view only their own preferences
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 4.2 INSERT: Authenticated users can insert only their own preference row
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4.3 UPDATE: Authenticated users can update only their own preferences
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4.4 DELETE: Intentionally omitted. Client users cannot delete their preference row.
-- Preference state remains stable; updates modify category flags instead.
