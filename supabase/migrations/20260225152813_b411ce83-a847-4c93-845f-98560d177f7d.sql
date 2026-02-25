
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS photo_captions jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attendance_files jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS expense_records jsonb NOT NULL DEFAULT '[]';
