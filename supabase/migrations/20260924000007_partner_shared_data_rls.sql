-- Seijun Phase 19 Batch 3: Shared Data & Authorization
-- Extends RLS policies to allow supporter SELECT access on owner data tables
-- when relationship is active AND the corresponding sharing preference is enabled.
--
-- SECURITY MODEL:
--   auth.uid() = supporter_user_id
--   AND relationship.status = 'active'
--   AND sharing_preference.<category> = true
--
-- INSERT/UPDATE/DELETE policies remain UNCHANGED — supporters CANNOT mutate owner data.

-- ==============================================================================
-- 1. CYCLES — Supporter Read Access (cycle_estimates OR period_status)
-- ==============================================================================

-- A supporter can SELECT owner's cycles if they have an active relationship
-- AND either cycle_estimates OR period_status sharing is enabled.
-- This policy only grants SELECT; existing INSERT/UPDATE/DELETE remain owner-only.

DROP POLICY IF EXISTS "Supporters can view partner cycles when shared" ON public.cycles;
CREATE POLICY "Supporters can view partner cycles when shared"
  ON public.cycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = cycles.user_id
        AND r.status = 'active'
        AND (sp.cycle_estimates = true OR sp.period_status = true)
    )
  );


-- ==============================================================================
-- 2. PERIOD_DAYS — Supporter Read Access (cycle_estimates OR period_status)
-- ==============================================================================

DROP POLICY IF EXISTS "Supporters can view partner period days when shared" ON public.period_days;
CREATE POLICY "Supporters can view partner period days when shared"
  ON public.period_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = period_days.user_id
        AND r.status = 'active'
        AND (sp.cycle_estimates = true OR sp.period_status = true)
    )
  );


-- ==============================================================================
-- 3. DAILY_NOTES — Supporter Read Access (daily_notes only)
-- ==============================================================================

DROP POLICY IF EXISTS "Supporters can view partner daily notes when shared" ON public.daily_notes;
CREATE POLICY "Supporters can view partner daily notes when shared"
  ON public.daily_notes FOR SELECT
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
    )
  );


-- ==============================================================================
-- 4. PROFILES — Supporter Read Access (cycle_preferences)
-- ==============================================================================

-- Supporter can read minimal profile fields when cycle_preferences is enabled.
-- The application layer further restricts which fields are returned.

DROP POLICY IF EXISTS "Supporters can view partner profile when shared" ON public.profiles;
CREATE POLICY "Supporters can view partner profile when shared"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_relationships r
      JOIN public.partner_sharing_preferences sp ON sp.relationship_id = r.id
      WHERE r.supporter_user_id = (SELECT auth.uid())
        AND r.owner_user_id = profiles.user_id
        AND r.status = 'active'
        AND (sp.cycle_preferences = true OR sp.cycle_estimates = true)
    )
  );


-- ==============================================================================
-- 5. VERIFICATION NOTES
-- ==============================================================================
-- • INSERT/UPDATE/DELETE policies on cycles, period_days, daily_notes, profiles
--   remain UNCHANGED. Supporters CANNOT mutate owner data at the database level.
-- • RLS enforces relationship.status = 'active', so revoked relationships
--   immediately lose SELECT access without any application-layer intervention.
-- • Each category is independently gated in RLS (daily_notes requires
--   sp.daily_notes = true, etc.), matching the application-layer authorization.
-- • The application layer provides additional data minimization by only
--   returning specific fields, but RLS provides the database-level boundary.
