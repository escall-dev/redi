-- ==============================================================================
-- Migration: 20260924000005_enable_realtime_notifications.sql
-- Description: Enables Supabase Realtime publication and full replica identity
--              for notification_events and partner_invitations so clients receive
--              instant live updates without refreshing the app.
-- ==============================================================================

-- 1. Ensure REPLICA IDENTITY FULL so all columns are included in realtime payloads
ALTER TABLE public.notification_events REPLICA IDENTITY FULL;
ALTER TABLE public.partner_invitations REPLICA IDENTITY FULL;

-- 2. Add tables to the supabase_realtime publication (idempotent DO block)
DO $$
BEGIN
  -- Enable realtime on notification_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notification_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_events;
  END IF;

  -- Enable realtime on partner_invitations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'partner_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_invitations;
  END IF;
END;
$$;
