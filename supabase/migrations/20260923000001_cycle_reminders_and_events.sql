-- Seijun Phase 18: Smart Cycle Reminders & Notification Intelligence Migration
-- 1. Updates public.notification_preferences with cycle reminder categories and reminder timing
-- 2. Creates public.notification_events with deterministic idempotency, foreign keys, indexes, and strict RLS

-- ==============================================================================
-- 1. NOTIFICATION PREFERENCES TABLE EXTENSIONS
-- ==============================================================================

-- Add cycle reminder category flags and reminder timing to public.notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS period_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS fertile_window_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ovulation_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cycle_transition_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS missed_period_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_days_before INT NOT NULL DEFAULT 3;

-- Add safe check constraint for reminder_days_before (0 = on expected day, 1 = 1 day before, 3 = 3 days before)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_notification_preferences_reminder_days'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT check_notification_preferences_reminder_days
      CHECK (reminder_days_before IN (0, 1, 3));
  END IF;
END $$;

-- ==============================================================================
-- 2. NOTIFICATION EVENTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '/dashboard',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe check constraint for notification status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_notification_events_status'
  ) THEN
    ALTER TABLE public.notification_events
      ADD CONSTRAINT check_notification_events_status
      CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));
  END IF;
END $$;

-- Safe check constraint for reminder types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_notification_events_type'
  ) THEN
    ALTER TABLE public.notification_events
      ADD CONSTRAINT check_notification_events_type
      CHECK (type IN (
        'period_upcoming',
        'period_expected',
        'fertile_window',
        'ovulation',
        'cycle_transition',
        'missed_period'
      ));
  END IF;
END $$;

-- ==============================================================================
-- 3. TRIGGERS: updated_at
-- ==============================================================================

DROP TRIGGER IF EXISTS set_notification_events_updated_at ON public.notification_events;
CREATE TRIGGER set_notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. INDEXES
-- ==============================================================================

-- Index for scheduler queries (finding pending due events efficiently)
CREATE INDEX IF NOT EXISTS idx_notification_events_user_status_scheduled
  ON public.notification_events(user_id, status, scheduled_for);

-- Index for cycle associations and cascade lookups
CREATE INDEX IF NOT EXISTS idx_notification_events_cycle_id
  ON public.notification_events(cycle_id);

-- Index for in-app notification center queries (filtering unread, sorting by creation)
CREATE INDEX IF NOT EXISTS idx_notification_events_user_read_created
  ON public.notification_events(user_id, read_at, created_at DESC);

-- ==============================================================================
-- 5. DETERMINISTIC IDEMPOTENCY / DUPLICATE PREVENTION
-- ==============================================================================

-- Prevents duplicate events for the same user, reminder type, scheduled date, and cycle
-- Only applies to active events (pending, sent, failed); cancelled events do not block recalculation
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_dedup
  ON public.notification_events (
    user_id,
    type,
    scheduled_for,
    COALESCE(cycle_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status != 'cancelled';

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- 6.1 SELECT: Authenticated users can view only their own notification events
DROP POLICY IF EXISTS "Users can view their own notification events" ON public.notification_events;
CREATE POLICY "Users can view their own notification events"
  ON public.notification_events FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 6.2 INSERT: Authenticated users can insert only their own notification events
DROP POLICY IF EXISTS "Users can insert their own notification events" ON public.notification_events;
CREATE POLICY "Users can insert their own notification events"
  ON public.notification_events FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 6.3 UPDATE: Authenticated users can update only their own notification events
DROP POLICY IF EXISTS "Users can update their own notification events" ON public.notification_events;
CREATE POLICY "Users can update their own notification events"
  ON public.notification_events FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 6.4 DELETE: Authenticated users can delete only their own notification events
DROP POLICY IF EXISTS "Users can delete their own notification events" ON public.notification_events;
CREATE POLICY "Users can delete their own notification events"
  ON public.notification_events FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
