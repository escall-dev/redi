-- Seijun Notification Sound Preference Migration
-- Adds sound_enabled to public.notification_preferences
-- Default: TRUE (Notification sound enabled by default)

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN NOT NULL DEFAULT TRUE;
