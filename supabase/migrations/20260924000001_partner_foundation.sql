-- Seijun Phase 19: Partner Connection Foundation (Batch 1)
-- 1. Creates public.partner_relationships with 1:1 constraints, state tracking, and strict RLS
-- 2. Creates public.partner_sharing_preferences with conservative privacy-first defaults and owner-only mutation
-- 3. Creates public.partner_invitations with token hashing, 7-day expiration, single-use, and duplicate protection

-- ==============================================================================
-- 1. PARTNER RELATIONSHIPS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.partner_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe check constraint for relationship status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_partner_relationships_status'
  ) THEN
    ALTER TABLE public.partner_relationships
      ADD CONSTRAINT check_partner_relationships_status
      CHECK (status IN ('pending', 'active', 'revoked', 'declined', 'expired'));
  END IF;
END $$;

-- Safe check constraint preventing self-partnering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_partner_relationships_not_self'
  ) THEN
    ALTER TABLE public.partner_relationships
      ADD CONSTRAINT check_partner_relationships_not_self
      CHECK (supporter_user_id IS NULL OR owner_user_id != supporter_user_id);
  END IF;
END $$;

-- Trigger: automatic updated_at
DROP TRIGGER IF EXISTS set_partner_relationships_updated_at ON public.partner_relationships;
CREATE TRIGGER set_partner_relationships_updated_at
  BEFORE UPDATE ON public.partner_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- General lookup indexes
CREATE INDEX IF NOT EXISTS idx_partner_relationships_owner
  ON public.partner_relationships(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_partner_relationships_supporter
  ON public.partner_relationships(supporter_user_id);

CREATE INDEX IF NOT EXISTS idx_partner_relationships_status
  ON public.partner_relationships(status);

-- 1:1 MODEL ENFORCEMENT VIA PARTIAL UNIQUE INDEXES
-- Exactly one active relationship per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_relationships_unique_active_owner
  ON public.partner_relationships (owner_user_id)
  WHERE status = 'active';

-- Exactly one active relationship per supporter
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_relationships_unique_active_supporter
  ON public.partner_relationships (supporter_user_id)
  WHERE status = 'active' AND supporter_user_id IS NOT NULL;

-- Exactly one pending relationship per owner to prevent duplicate active invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_relationships_unique_pending_owner
  ON public.partner_relationships (owner_user_id)
  WHERE status = 'pending';


-- ==============================================================================
-- 2. PARTNER SHARING PREFERENCES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.partner_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL UNIQUE REFERENCES public.partner_relationships(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_estimates BOOLEAN NOT NULL DEFAULT FALSE,
  period_status BOOLEAN NOT NULL DEFAULT FALSE,
  cycle_preferences BOOLEAN NOT NULL DEFAULT FALSE,
  daily_notes BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: automatic updated_at
DROP TRIGGER IF EXISTS set_partner_sharing_preferences_updated_at ON public.partner_sharing_preferences;
CREATE TRIGGER set_partner_sharing_preferences_updated_at
  BEFORE UPDATE ON public.partner_sharing_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for sharing preferences
CREATE INDEX IF NOT EXISTS idx_partner_sharing_prefs_relationship
  ON public.partner_sharing_preferences(relationship_id);

CREATE INDEX IF NOT EXISTS idx_partner_sharing_prefs_owner
  ON public.partner_sharing_preferences(owner_user_id);

-- Trigger function to atomically populate default conservative sharing preferences
CREATE OR REPLACE FUNCTION public.handle_new_partner_relationship()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.partner_sharing_preferences (
    relationship_id,
    owner_user_id,
    cycle_estimates,
    period_status,
    cycle_preferences,
    daily_notes
  ) VALUES (
    NEW.id,
    NEW.owner_user_id,
    FALSE,
    FALSE,
    FALSE,
    FALSE
  ) ON CONFLICT (relationship_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_partner_relationship_created ON public.partner_relationships;
CREATE TRIGGER on_partner_relationship_created
  AFTER INSERT ON public.partner_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_partner_relationship();


-- ==============================================================================
-- 3. PARTNER INVITATIONS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.partner_relationships(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe check constraint for invitation status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_partner_invitations_status'
  ) THEN
    ALTER TABLE public.partner_invitations
      ADD CONSTRAINT check_partner_invitations_status
      CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled'));
  END IF;
END $$;

-- Trigger: automatic updated_at
DROP TRIGGER IF EXISTS set_partner_invitations_updated_at ON public.partner_invitations;
CREATE TRIGGER set_partner_invitations_updated_at
  BEFORE UPDATE ON public.partner_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_partner_invitations_inviter
  ON public.partner_invitations(inviter_user_id);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_relationship
  ON public.partner_invitations(relationship_id);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_token_hash
  ON public.partner_invitations(token_hash);

-- Duplicate prevention: At most one pending invitation per inviter
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_invitations_unique_pending_inviter
  ON public.partner_invitations (inviter_user_id)
  WHERE status = 'pending';


-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 4.1 partner_relationships RLS
ALTER TABLE public.partner_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own partner relationships" ON public.partner_relationships;
CREATE POLICY "Users can view their own partner relationships"
  ON public.partner_relationships FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = owner_user_id OR
    (SELECT auth.uid()) = supporter_user_id
  );

DROP POLICY IF EXISTS "Owners can insert their partner relationships" ON public.partner_relationships;
CREATE POLICY "Owners can insert their partner relationships"
  ON public.partner_relationships FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_user_id);

DROP POLICY IF EXISTS "Participants can update their partner relationships" ON public.partner_relationships;
CREATE POLICY "Participants can update their partner relationships"
  ON public.partner_relationships FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = owner_user_id OR
    (SELECT auth.uid()) = supporter_user_id
  )
  WITH CHECK (
    (SELECT auth.uid()) = owner_user_id OR
    (SELECT auth.uid()) = supporter_user_id
  );

DROP POLICY IF EXISTS "Owners can delete their partner relationships" ON public.partner_relationships;
CREATE POLICY "Owners can delete their partner relationships"
  ON public.partner_relationships FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_user_id);


-- 4.2 partner_sharing_preferences RLS
ALTER TABLE public.partner_sharing_preferences ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner can always view. Connected supporter can view ONLY if relationship is active.
DROP POLICY IF EXISTS "Authorized participants can view sharing preferences" ON public.partner_sharing_preferences;
CREATE POLICY "Authorized participants can view sharing preferences"
  ON public.partner_sharing_preferences FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = owner_user_id OR
    EXISTS (
      SELECT 1 FROM public.partner_relationships r
      WHERE r.id = relationship_id
        AND r.supporter_user_id = (SELECT auth.uid())
        AND r.status = 'active'
    )
  );

-- INSERT: Owner ONLY
DROP POLICY IF EXISTS "Owners can insert sharing preferences" ON public.partner_sharing_preferences;
CREATE POLICY "Owners can insert sharing preferences"
  ON public.partner_sharing_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_user_id);

-- UPDATE: Owner ONLY (supporter cannot modify)
DROP POLICY IF EXISTS "Owners can update sharing preferences" ON public.partner_sharing_preferences;
CREATE POLICY "Owners can update sharing preferences"
  ON public.partner_sharing_preferences FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_user_id)
  WITH CHECK ((SELECT auth.uid()) = owner_user_id);

-- DELETE: Owner ONLY
DROP POLICY IF EXISTS "Owners can delete sharing preferences" ON public.partner_sharing_preferences;
CREATE POLICY "Owners can delete sharing preferences"
  ON public.partner_sharing_preferences FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_user_id);


-- 4.3 partner_invitations RLS
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Inviter can view their own invitations
DROP POLICY IF EXISTS "Inviters can view their invitations" ON public.partner_invitations;
CREATE POLICY "Inviters can view their invitations"
  ON public.partner_invitations FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = inviter_user_id);

-- INSERT: Inviter ONLY
DROP POLICY IF EXISTS "Inviters can insert invitations" ON public.partner_invitations;
CREATE POLICY "Inviters can insert invitations"
  ON public.partner_invitations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = inviter_user_id);

-- UPDATE: Inviter can cancel/update their invitations
DROP POLICY IF EXISTS "Inviters can update their invitations" ON public.partner_invitations;
CREATE POLICY "Inviters can update their invitations"
  ON public.partner_invitations FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = inviter_user_id)
  WITH CHECK ((SELECT auth.uid()) = inviter_user_id);

-- DELETE: Inviter ONLY
DROP POLICY IF EXISTS "Inviters can delete their invitations" ON public.partner_invitations;
CREATE POLICY "Inviters can delete their invitations"
  ON public.partner_invitations FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = inviter_user_id);
