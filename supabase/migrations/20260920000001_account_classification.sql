-- Redi / Seijun Phase 16: Account Classification Migration
-- Adds 'sex' and 'usage_role' to public.profiles with safe constraints and non-destructive backfill

-- 1. Add 'sex' and 'usage_role' columns if they do not exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS usage_role TEXT;

-- 2. Add safe check constraints for sex and usage_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_sex'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_profiles_sex
      CHECK (sex IS NULL OR sex IN ('male', 'female', 'prefer_not_to_say'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_usage_role'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_profiles_usage_role
      CHECK (usage_role IS NULL OR usage_role IN ('cycle_tracker', 'supporter', 'both'));
  END IF;
END $$;

-- 3. Non-destructive backfill for existing users who already completed onboarding:
-- Existing users have already configured cycle tracking, so default their usage_role to 'cycle_tracker'.
-- Leave 'sex' as NULL so existing accounts continue functioning without forced re-registration.
UPDATE public.profiles
SET usage_role = 'cycle_tracker'
WHERE usage_role IS NULL AND onboarding_completed = true;
