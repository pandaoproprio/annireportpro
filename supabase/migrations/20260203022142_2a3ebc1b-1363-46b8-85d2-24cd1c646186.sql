-- Add customizable footer field to team_reports
ALTER TABLE public.team_reports 
ADD COLUMN footer_text text DEFAULT NULL;