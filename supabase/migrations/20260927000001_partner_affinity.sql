-- Seijun Phase 20: Affinity & Partner Experience
-- 1. Adds relationship_start_date to public.partner_relationships
-- 2. Adds affinity_display_format to public.profiles
-- 3. Adds validation constraints and update triggers

-- ==============================================================================
-- 1. RELATIONSHIP START DATE (ANNIVERSARY) ON PARTNER_RELATIONSHIPS
-- ==============================================================================

ALTER TABLE public.partner_relationships
  ADD COLUMN IF NOT EXISTS relationship_start_date DATE;

-- Safe check constraint: relationship_start_date cannot be in the future
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_partner_relationships_start_date_not_future'
  ) THEN
    ALTER TABLE public.partner_relationships
      ADD CONSTRAINT check_partner_relationships_start_date_not_future
      CHECK (relationship_start_date IS NULL OR relationship_start_date <= CURRENT_DATE);
  END IF;
END $$;

-- Index for relationship start date queries
CREATE INDEX IF NOT EXISTS idx_partner_relationships_start_date
  ON public.partner_relationships(relationship_start_date);


-- ==============================================================================
-- 2. AFFINITY DURATION DISPLAY FORMAT PREFERENCE ON PROFILES
-- ==============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS affinity_display_format TEXT NOT NULL DEFAULT 'detailed';

-- Safe check constraint for allowed duration display formats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_affinity_display_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_profiles_affinity_display_format
      CHECK (affinity_display_format IN ('detailed', 'years_months', 'months_days', 'weeks_days', 'total_days'));
  END IF;
END $$;
