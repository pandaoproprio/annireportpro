
-- 1. Create trigger for auto-filling setor_responsavel on activities
CREATE OR REPLACE TRIGGER trg_fill_setor_responsavel
  BEFORE INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_setor_responsavel();

-- 2. Fix report_diary_links RLS: drop RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage all diary links" ON public.report_diary_links;
DROP POLICY IF EXISTS "Users can delete own diary links" ON public.report_diary_links;
DROP POLICY IF EXISTS "Users can insert own diary links" ON public.report_diary_links;
DROP POLICY IF EXISTS "Users can view own diary links" ON public.report_diary_links;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can manage all diary links"
  ON public.report_diary_links
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view own diary links"
  ON public.report_diary_links
  FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Users can insert own diary links"
  ON public.report_diary_links
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own diary links"
  ON public.report_diary_links
  FOR DELETE
  USING (auth.uid() = author_id);
