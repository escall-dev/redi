-- Seijun Phase 19 Batch 4: Partner Co-Management RLS & Permissions
-- Extends partner_sharing_preferences with granular co-management flags
-- and adds surgical RLS policies for authorized supporter mutations on owner data.
--
-- SECURITY ARCHITECTURE:
--   auth.uid() = supporter_user_id
--   AND relationship.status = 'active'
--   AND sharing_preference.<view_category> = true
--   AND sharing_preference.<manage_category> = true
--   AND target_table.user_id = relationship.owner_user_id
--
-- Strict Principle: Supporter writes require BOTH the view permission AND the explicit manage permission.
-- Revoked relationships immediately lose all write access at the database level.
-- Existing owner policies remain completely untouched.

-- ==============================================================================
-- 1. ADD CO-MANAGEMENT COLUMNS TO PARTNER_SHARING_PREFERENCES
-- ==============================================================================

ALTER TABLE public.partner_sharing_preferences
  ADD COLUMN IF NOT EXISTS manage_cycle_preferences BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manage_period_status BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manage_daily_notes BOOLEAN NOT NULL DEFAULT FALSE;

-- Update trigger function to initialize co-management permissions to FALSE by default
CREATE OR REPLACE FUNCTION public.handle_new_partner_relationship()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.partner_sharing_preferences (
    relationship_id,
    owner_user_id,
    cycle_estimates,
    period_status,
    cycle_preferences,
    daily_notes,
    manage_cycle_preferences,
    manage_period_status,
    manage_daily_notes
  ) VALUES (
    NEW.id,
    NEW.owner_user_id,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE
  ) ON CONFLICT (relationship_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 2. CYCLES — Supporter INSERT & UPDATE Policies (manage_period_status)
-- ==============================================================================

-- Supporter can INSERT cycles for the owner ONLY if:
-- 1. Relationship is active
-- 2. Supporter is auth.uid()
-- 3. Cycle user_id equals owner_user_id
-- 4. Both period_status and manage_period_status are TRUE

DROP POLICY IF EXISTS "Supporters can insert partner cycles when authorized" ON public.cycles;
CREATE POLICY "Supporters can insert partner cycles when authorized"
  ON public.cycles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = cycles.user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  );

-- Supporter can UPDATE cycles for the owner ONLY if authorized
DROP POLICY IF EXISTS "Supporters can update partner cycles when authorized" ON public.cycles;
CREATE POLICY "Supporters can update partner cycles when authorized"
  ON public.cycles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = cycles.user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = cycles.user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  );


-- ==============================================================================
-- 3. PERIOD_DAYS — Supporter INSERT, UPDATE & DELETE Policies (manage_period_status)
-- ==============================================================================

DROP POLICY IF EXISTS "Supporters can insert partner period days when authorized" ON public.period_days;
CREATE POLICY "Supporters can insert partner period days when authorized"
  ON public.period_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      JOIN public.cycles c ON c.id = period_days.cycle_id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = period_days.user_id
        AND c.user_id = r.owner_user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  );

DROP POLICY IF EXISTS "Supporters can update partner period days when authorized" ON public.period_days;
CREATE POLICY "Supporters can update partner period days when authorized"
  ON public.period_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = period_days.user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = period_days.user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  );

DROP POLICY IF EXISTS "Supporters can delete partner period days when authorized" ON public.period_days;
CREATE POLICY "Supporters can delete partner period days when authorized"
  ON public.period_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = period_days.user_id
        AND r.status = 'active'
        AND sp.period_status = true
        AND sp.manage_period_status = true
    )
  );


-- ==============================================================================
-- 4. DAILY_NOTES — Supporter INSERT, UPDATE & DELETE Policies (manage_daily_notes)
-- ==============================================================================

DROP POLICY IF EXISTS "Supporters can insert partner daily notes when authorized" ON public.daily_notes;
CREATE POLICY "Supporters can insert partner daily notes when authorized"
  ON public.daily_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = daily_notes.user_id
        AND r.status = 'active'
        AND sp.daily_notes = true
        AND sp.manage_daily_notes = true
    )
  );

DROP POLICY IF EXISTS "Supporters can update partner daily notes when authorized" ON public.daily_notes;
CREATE POLICY "Supporters can update partner daily notes when authorized"
  ON public.daily_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = daily_notes.user_id
        AND r.status = 'active'
        AND sp.daily_notes = true
        AND sp.manage_daily_notes = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = daily_notes.user_id
        AND r.status = 'active'
        AND sp.daily_notes = true
        AND sp.manage_daily_notes = true
    )
  );

DROP POLICY IF EXISTS "Supporters can delete partner daily notes when authorized" ON public.daily_notes;
CREATE POLICY "Supporters can delete partner daily notes when authorized"
  ON public.daily_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = daily_notes.user_id
        AND r.status = 'active'
        AND sp.daily_notes = true
        AND sp.manage_daily_notes = true
    )
  );


-- ==============================================================================
-- 5. PROFILES — Supporter UPDATE Policy (manage_cycle_preferences)
-- ==============================================================================

DROP POLICY IF EXISTS "Supporters can update partner profile cycle preferences when authorized" ON public.profiles;
CREATE POLICY "Supporters can update partner profile cycle preferences when authorized"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = profiles.user_id
        AND r.status = 'active'
        AND sp.cycle_preferences = true
        AND sp.manage_cycle_preferences = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = profiles.user_id
        AND r.status = 'active'
        AND sp.cycle_preferences = true
        AND sp.manage_cycle_preferences = true
    )
  );
