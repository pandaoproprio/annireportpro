
-- Add report_type column to project_report_templates for direct lookup by project + type
ALTER TABLE public.project_report_templates
  ADD COLUMN IF NOT EXISTS report_type text;

-- Create unique constraint so each project has at most one config per report type
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_report_templates_project_type
  ON public.project_report_templates (project_id, report_type)
  WHERE report_type IS NOT NULL;

-- Allow template_id to be nullable (visual configs don't need a template reference)
ALTER TABLE public.project_report_templates
  ALTER COLUMN template_id DROP NOT NULL;
