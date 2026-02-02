-- Add photo_captions column to team_reports table for storing captions with photos
ALTER TABLE public.team_reports 
ADD COLUMN IF NOT EXISTS photo_captions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add is_draft column to track draft status
ALTER TABLE public.team_reports 
ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT true;

-- Add index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_team_reports_is_draft ON public.team_reports(is_draft);
CREATE INDEX IF NOT EXISTS idx_team_reports_project_member ON public.team_reports(project_id, team_member_id);