-- Redi Phase 6: Onboarding Schema Migration
-- Adds onboarding metadata to the profiles table while preserving existing RLS and data

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_period_start DATE,
  ADD COLUMN IF NOT EXISTS typical_cycle_length INTEGER,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Safe constraint addition for typical cycle length range (21–45 days)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_typical_cycle_length'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_profiles_typical_cycle_length
      CHECK (typical_cycle_length IS NULL OR (typical_cycle_length >= 21 AND typical_cycle_length <= 45));
  END IF;
END $$;
