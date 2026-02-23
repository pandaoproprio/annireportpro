-- Add section_photos jsonb column to store photos per section
ALTER TABLE public.justification_reports 
ADD COLUMN section_photos jsonb NOT NULL DEFAULT '{}'::jsonb;