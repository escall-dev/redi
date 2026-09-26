-- Seijun Phase 19 Daily Notes Architecture Fix
-- Multi-Entry Notes Per Day + Timestamp + Note Authorship + Timeline Indexes
--
-- 1. Remove one-note-per-day constraint
-- 2. Add author_id column to track note creator (owner vs partner/co-manager)
-- 3. Backfill author_id for existing notes
-- 4. Add performance indexes for (user_id, date DESC, created_at DESC) and author_id

-- ==============================================================================
-- 1. REMOVE ONE-NOTE-PER-DAY CONSTRAINT
-- ==============================================================================

ALTER TABLE public.daily_notes
  DROP CONSTRAINT IF EXISTS unique_user_daily_note_date;

-- ==============================================================================
-- 2. NOTE AUTHORSHIP COLUMN
-- ==============================================================================

-- author_id identifies who created the note entry (owner vs authorized supporter)
ALTER TABLE public.daily_notes
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill existing notes: author_id defaults to user_id (the cycle owner)
UPDATE public.daily_notes
  SET author_id = user_id
  WHERE author_id IS NULL;

-- Set default for author_id to auth.uid()
ALTER TABLE public.daily_notes
  ALTER COLUMN author_id SET DEFAULT auth.uid();

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================

-- Index for efficient date + chronological timeline ordering (newest first)
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_date_created
  ON public.daily_notes(user_id, date DESC, created_at DESC);

-- Index for querying notes by author
CREATE INDEX IF NOT EXISTS idx_daily_notes_author_id
  ON public.daily_notes(author_id);
