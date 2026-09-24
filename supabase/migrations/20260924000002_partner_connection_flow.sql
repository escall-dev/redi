-- Seijun Phase 19: Partner Connection & Invitation Flow (Batch 2)
-- 1. Adds 'username' to public.profiles with format constraints, unique indexing, and non-destructive backfill
-- 2. Adds 'invitee_user_id' to public.partner_invitations for strict recipient-specific binding
-- 3. Updates RLS policies on public.partner_invitations so invitees can view incoming invitations
-- 4. Creates atomic PostgreSQL RPC 'accept_partner_invitation' for race-proof acceptance

-- ==============================================================================
-- 1. USERNAME FOUNDATION ON PROFILES TABLE
-- ==============================================================================

-- 1.1 Add 'username' column if it does not exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 1.2 Safe check constraint for username format:
-- 3 to 30 characters, lowercase letters, digits, and underscores only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_username_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_profiles_username_format
      CHECK (username IS NULL OR (username ~ '^[a-z0-9_]{3,30}$'));
  END IF;
END $$;

-- 1.3 Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 1.4 Non-destructive backfill:
-- For existing users without a username, assign a deterministic unique handle 'user_<8 chars>'
UPDATE public.profiles
SET username = 'user_' || LOWER(SUBSTRING(REPLACE(user_id::text, '-', '') FROM 1 FOR 8))
WHERE username IS NULL;


-- ==============================================================================
-- 2. RECIPIENT BINDING ON PARTNER INVITATIONS TABLE
-- ==============================================================================

-- 2.1 Add 'invitee_user_id' column if it does not exist
ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS invitee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2.2 Safe check constraint: inviter cannot invite themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_partner_invitations_not_self'
  ) THEN
    ALTER TABLE public.partner_invitations
      ADD CONSTRAINT check_partner_invitations_not_self
      CHECK (invitee_user_id IS NULL OR inviter_user_id != invitee_user_id);
  END IF;
END $$;

-- 2.3 Indexes for fast lookup of incoming invitations
CREATE INDEX IF NOT EXISTS idx_partner_invitations_invitee
  ON public.partner_invitations (invitee_user_id);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_invitee_pending
  ON public.partner_invitations (invitee_user_id)
  WHERE status = 'pending';


-- ==============================================================================
-- 3. RLS POLICIES FOR INCOMING INVITATIONS
-- ==============================================================================

-- Update SELECT policy so users can view invitations they sent OR received
DROP POLICY IF EXISTS "Inviters can view their invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.partner_invitations;

CREATE POLICY "Users can view invitations they sent or received"
  ON public.partner_invitations FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = inviter_user_id OR
    (SELECT auth.uid()) = invitee_user_id
  );

-- Allow authenticated users to search public profile handles for partner discovery
DROP POLICY IF EXISTS "Authenticated users can search public profiles by username" ON public.profiles;
CREATE POLICY "Authenticated users can search public profiles by username"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (username IS NOT NULL);

-- Safe RPC: search_partner_by_username
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

-- Safe RPC: resolve_partner_by_username
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


-- ==============================================================================
-- 4. ATOMIC ACCEPTANCE RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.accept_partner_invitation(
  p_token_hash TEXT,
  p_accepting_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation RECORD;
  v_relationship RECORD;
  v_now TIMESTAMPTZ := now();
  v_existing_active UUID;
BEGIN
  -- 1. Fetch invitation with row-level lock for atomic update
  SELECT id, relationship_id, inviter_user_id, invitee_user_id, expires_at, status
  INTO v_invitation
  FROM public.partner_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation not found or invalid token.');
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
