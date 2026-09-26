-- Migration: 20260924000009_partner_invitation_acceptance_fix.sql
-- Seijun Phase 19: Partner Invitation Acceptance RLS & RPC Fix
-- 1. Updates RLS policies on partner_relationships to allow authorized invitees to accept/decline pending relationships
-- 2. Updates RLS policies on partner_invitations to allow authorized invitees to accept/decline pending invitations
-- 3. Grants execute permissions on accept_partner_invitation RPC to authenticated users
-- 4. Creates atomic accept_partner_invitation_by_id and decline_partner_invitation_by_id RPCs for in-app UI

-- ==============================================================================
-- 1. PARTNER RELATIONSHIPS UPDATE POLICY
-- ==============================================================================
-- Allow owner, supporter, or the invited recipient of a pending invitation to update the relationship
DROP POLICY IF EXISTS "Participants can update their partner relationships" ON public.partner_relationships;
CREATE POLICY "Participants can update their partner relationships"
  ON public.partner_relationships FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = owner_user_id OR
    (SELECT auth.uid()) = supporter_user_id OR
    (
      status = 'pending' AND
      EXISTS (
        SELECT 1 FROM public.partner_invitations i
        WHERE i.relationship_id = public.partner_relationships.id
          AND i.status = 'pending'
          AND i.expires_at > now()
          AND (i.invitee_user_id = (SELECT auth.uid()) OR i.invitee_user_id IS NULL)
      )
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = owner_user_id OR
    (SELECT auth.uid()) = supporter_user_id
  );

-- ==============================================================================
-- 2. PARTNER INVITATIONS UPDATE POLICY
-- ==============================================================================
-- Allow inviter, or the invited recipient to update the pending invitation to accepted or declined
DROP POLICY IF EXISTS "Inviters can update their invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Participants can update their invitations" ON public.partner_invitations;
CREATE POLICY "Participants can update their invitations"
  ON public.partner_invitations FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = inviter_user_id OR
    (
      status = 'pending' AND
      expires_at > now() AND
      (invitee_user_id = (SELECT auth.uid()) OR invitee_user_id IS NULL)
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = inviter_user_id OR
    (
      status IN ('accepted', 'declined') AND
      (invitee_user_id = (SELECT auth.uid()) OR invitee_user_id IS NULL)
    )
  );

-- ==============================================================================
-- 3. GRANT PERMISSION ON EXISTING ACCEPT RPC
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.accept_partner_invitation(TEXT, UUID) TO authenticated;

-- ==============================================================================
-- 4. ATOMIC ACCEPTANCE RPC BY INVITATION ID
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.accept_partner_invitation_by_id(
  p_invitation_id UUID,
  p_accepting_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation RECORD;
  v_now TIMESTAMPTZ := now();
  v_existing_active UUID;
BEGIN
  -- 1. Fetch invitation with row-level lock for atomic update
  SELECT id, relationship_id, inviter_user_id, invitee_user_id, expires_at, status
  INTO v_invitation
  FROM public.partner_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation not found.');
  END IF;

  -- 2. Validate invitation status
  IF v_invitation.status != 'pending' THEN
    IF v_invitation.status = 'accepted' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This invitation has already been accepted and cannot be reused.');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'This invitation is ' || v_invitation.status || ' and cannot be accepted.');
  END IF;

  -- 3. Validate expiration (7 days)
  IF v_invitation.expires_at <= v_now THEN
    UPDATE public.partner_invitations SET status = 'expired', updated_at = v_now WHERE id = v_invitation.id;
    UPDATE public.partner_relationships SET status = 'expired', updated_at = v_now WHERE id = v_invitation.relationship_id AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'error', 'This invitation has expired.');
  END IF;

  -- 4. Prevent self-acceptance
  IF v_invitation.inviter_user_id = p_accepting_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot accept your own invitation.');
  END IF;

  -- 5. Recipient binding: if an intended invitee was specified, only they can accept
  IF v_invitation.invitee_user_id IS NOT NULL AND v_invitation.invitee_user_id != p_accepting_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This invitation was addressed to a different account.');
  END IF;

  -- 6. Enforce 1:1 rule: check if accepting user already has an active relationship
  SELECT id INTO v_existing_active
  FROM public.partner_relationships
  WHERE (owner_user_id = p_accepting_user_id OR supporter_user_id = p_accepting_user_id)
    AND status = 'active'
  LIMIT 1;

  IF v_existing_active IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already have an active partner connection. 1:1 model allows only one active connection.');
  END IF;

  -- 7. Enforce 1:1 rule: check if inviter already has an active relationship
  SELECT id INTO v_existing_active
  FROM public.partner_relationships
  WHERE (owner_user_id = v_invitation.inviter_user_id OR supporter_user_id = v_invitation.inviter_user_id)
    AND status = 'active'
  LIMIT 1;

  IF v_existing_active IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'The invitation sender already has an active partner connection.');
  END IF;

  -- 8. Atomically update relationship and invitation in the same transaction
  UPDATE public.partner_relationships
  SET supporter_user_id = p_accepting_user_id,
      status = 'active',
      accepted_at = v_now,
      updated_at = v_now
  WHERE id = v_invitation.relationship_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Associated relationship is no longer pending.');
  END IF;

  UPDATE public.partner_invitations
  SET status = 'accepted',
      accepted_at = v_now,
      updated_at = v_now
  WHERE id = v_invitation.id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'ok', true,
    'relationship_id', v_invitation.relationship_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_partner_invitation_by_id(UUID, UUID) TO authenticated;

-- ==============================================================================
-- 5. ATOMIC DECLINE RPC BY INVITATION ID
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.decline_partner_invitation_by_id(
  p_invitation_id UUID,
  p_declining_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT id, relationship_id, inviter_user_id, invitee_user_id, status
  INTO v_invitation
  FROM public.partner_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation not found.');
  END IF;

  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation cannot be declined because it is ' || v_invitation.status || '.');
  END IF;

  IF v_invitation.inviter_user_id = p_declining_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot decline your own invitation.');
  END IF;

  IF v_invitation.invitee_user_id IS NOT NULL AND v_invitation.invitee_user_id != p_declining_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This invitation was addressed to a different account.');
  END IF;

  UPDATE public.partner_invitations
  SET status = 'declined',
      declined_at = v_now,
      updated_at = v_now
  WHERE id = v_invitation.id;

  UPDATE public.partner_relationships
  SET status = 'declined',
      updated_at = v_now
  WHERE id = v_invitation.relationship_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_partner_invitation_by_id(UUID, UUID) TO authenticated;
