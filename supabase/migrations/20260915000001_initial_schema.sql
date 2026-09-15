-- Redi Phase 4: Initial Database Schema & Row Level Security
-- Tables: profiles, cycles, period_days, symptoms, daily_notes

-- ==============================================================================
-- 1. EXTENSIONS & FUNCTIONS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automatic updated_at timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. TABLES & CONSTRAINTS
-- ==============================================================================

-- Table 1: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: cycles
CREATE TABLE IF NOT EXISTS public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  cycle_length INTEGER,
  period_duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_cycles_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_cycles_cycle_length CHECK (cycle_length IS NULL OR cycle_length > 0),
  CONSTRAINT check_cycles_period_duration CHECK (period_duration IS NULL OR period_duration > 0)
);

-- Table 3: period_days
CREATE TABLE IF NOT EXISTS public.period_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  flow TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_period_days_flow CHECK (flow IN ('light', 'medium', 'heavy')),
  CONSTRAINT unique_user_period_date UNIQUE (user_id, date)
);

-- Table 4: symptoms
CREATE TABLE IF NOT EXISTS public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symptom TEXT NOT NULL,
  severity TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_symptoms_severity CHECK (severity IN ('mild', 'moderate', 'severe'))
);

-- Table 5: daily_notes
CREATE TABLE IF NOT EXISTS public.daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_daily_note_date UNIQUE (user_id, date)
);

-- ==============================================================================
-- 3. TRIGGERS
-- ==============================================================================

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cycles_updated_at ON public.cycles;
CREATE TRIGGER set_cycles_updated_at
  BEFORE UPDATE ON public.cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_daily_notes_updated_at ON public.daily_notes;
CREATE TRIGGER set_daily_notes_updated_at
  BEFORE UPDATE ON public.daily_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_user_start_date ON public.cycles(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_period_days_cycle_id ON public.period_days(cycle_id);
CREATE INDEX IF NOT EXISTS idx_period_days_user_date ON public.period_days(user_id, date);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date ON public.symptoms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_date ON public.daily_notes(user_id, date);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5.1 profiles policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 5.2 cycles policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own cycles" ON public.cycles;
CREATE POLICY "Users can view their own cycles"
  ON public.cycles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own cycles" ON public.cycles;
CREATE POLICY "Users can insert their own cycles"
  ON public.cycles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cycles" ON public.cycles;
CREATE POLICY "Users can update their own cycles"
  ON public.cycles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own cycles" ON public.cycles;
CREATE POLICY "Users can delete their own cycles"
  ON public.cycles FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 5.3 period_days policies (protected by BOTH user_id AND cycle ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own period days" ON public.period_days;
CREATE POLICY "Users can view their own period days"
  ON public.period_days FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = period_days.cycle_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own period days" ON public.period_days;
CREATE POLICY "Users can insert their own period days"
  ON public.period_days FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = period_days.cycle_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own period days" ON public.period_days;
CREATE POLICY "Users can update their own period days"
  ON public.period_days FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = period_days.cycle_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = period_days.cycle_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own period days" ON public.period_days;
CREATE POLICY "Users can delete their own period days"
  ON public.period_days FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = period_days.cycle_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- 5.4 symptoms policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own symptoms" ON public.symptoms;
CREATE POLICY "Users can view their own symptoms"
  ON public.symptoms FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own symptoms" ON public.symptoms;
CREATE POLICY "Users can insert their own symptoms"
  ON public.symptoms FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own symptoms" ON public.symptoms;
CREATE POLICY "Users can update their own symptoms"
  ON public.symptoms FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own symptoms" ON public.symptoms;
CREATE POLICY "Users can delete their own symptoms"
  ON public.symptoms FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 5.5 daily_notes policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own daily notes" ON public.daily_notes;
CREATE POLICY "Users can view their own daily notes"
  ON public.daily_notes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily notes" ON public.daily_notes;
CREATE POLICY "Users can insert their own daily notes"
  ON public.daily_notes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own daily notes" ON public.daily_notes;
CREATE POLICY "Users can update their own daily notes"
  ON public.daily_notes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own daily notes" ON public.daily_notes;
CREATE POLICY "Users can delete their own daily notes"
  ON public.daily_notes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
