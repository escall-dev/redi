-- ==============================================================================
-- Migration: 20260924000004_partner_notifications.sql
-- Description: Enables in-app and push notification delivery for partner invitations.
-- ==============================================================================

-- 1. Extend notification_events constraint to permit partner_invitation type
ALTER TABLE public.notification_events DROP CONSTRAINT IF EXISTS check_notification_events_type;
ALTER TABLE public.notification_events ADD CONSTRAINT check_notification_events_type
  CHECK (type IN (
    'period_upcoming',
    'period_expected',
    'fertile_window',
    'ovulation',
    'cycle_transition',
    'missed_period',
    'partner_invitation'
  ));

-- 2. Safe RPC: notify_partner_invitation
-- Securely inserts an in-app notification event for the invited partner
CREATE OR REPLACE FUNCTION public.notify_partner_invitation(
  p_invitee_user_id UUID,
  p_inviter_user_id UUID,
  p_inviter_username TEXT,
  p_inviter_display_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_title TEXT := 'Partner Invitation';
  v_body TEXT;
BEGIN
  IF p_inviter_display_name IS NOT NULL AND p_inviter_display_name <> '' AND p_inviter_display_name <> p_inviter_username THEN
    v_body := p_inviter_display_name || ' (@' || p_inviter_username || ') sent you a partner invitation.';
  ELSE
    v_body := '@' || p_inviter_username || ' sent you a partner invitation.';
  END IF;

  INSERT INTO public.notification_events (
    user_id,
    type,
    title,
    body,
    url,
    status,
    scheduled_for
  )
  VALUES (
    p_invitee_user_id,
    'partner_invitation',
    v_title,
    v_body,
    '/settings/partner',
    'sent',
    NOW()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- 3. Safe RPC: get_partner_push_subscriptions
-- Retrieves push subscriptions for the invited partner securely
CREATE OR REPLACE FUNCTION public.get_partner_push_subscriptions(
  p_target_user_id UUID
)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
  FROM public.push_subscriptions ps
  WHERE ps.user_id = p_target_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.notify_partner_invitation(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_push_subscriptions(UUID) TO authenticated;
