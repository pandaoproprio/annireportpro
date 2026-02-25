
-- Priority 4: Data integrity fixes

-- 1. Add UNIQUE constraint on project_report_templates(project_id, report_type)
-- Use a partial unique index to handle NULL report_type correctly
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_project_report_type
ON public.project_report_templates (project_id, report_type)
WHERE report_type IS NOT NULL;

-- 2. Add section_docs column to justification_reports
ALTER TABLE public.justification_reports
ADD COLUMN IF NOT EXISTS section_docs jsonb NOT NULL DEFAULT '{}'::jsonb;
