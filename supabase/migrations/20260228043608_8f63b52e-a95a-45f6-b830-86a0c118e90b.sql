
-- 1. Add setor_responsavel column to activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS setor_responsavel text;

-- 2. Create report_diary_links table for Diary→Report integration
CREATE TABLE IF NOT EXISTS public.report_diary_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'report_object',
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicates
ALTER TABLE public.report_diary_links ADD CONSTRAINT unique_report_activity UNIQUE (report_id, activity_id);

-- Enable RLS
ALTER TABLE public.report_diary_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_diary_links
CREATE POLICY "Users can insert own diary links" ON public.report_diary_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can view own diary links" ON public.report_diary_links
  FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all diary links" ON public.report_diary_links
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage all diary links" ON public.report_diary_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete own diary links" ON public.report_diary_links
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_report_diary_links_report ON public.report_diary_links(report_id, report_type);
CREATE INDEX IF NOT EXISTS idx_report_diary_links_activity ON public.report_diary_links(activity_id);
