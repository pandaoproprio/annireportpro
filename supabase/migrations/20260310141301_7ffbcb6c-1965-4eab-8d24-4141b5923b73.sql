
-- Fix report_diary_links: change RESTRICTIVE policies to PERMISSIVE
-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage all diary links" ON public.report_diary_links;
DROP POLICY IF EXISTS "Users can delete own diary links" ON public.report_diary_links;
DROP POLICY IF EXISTS "Users can insert own diary links" ON public.report_diary_links;
DROP POLICY IF EXISTS "Users can view own diary links" ON public.report_diary_links;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can manage all diary links"
ON public.report_diary_links
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view own diary links"
ON public.report_diary_links
FOR SELECT
TO public
USING (auth.uid() = author_id);

CREATE POLICY "Users can insert own diary links"
ON public.report_diary_links
FOR INSERT
TO public
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own diary links"
ON public.report_diary_links
FOR DELETE
TO public
USING (auth.uid() = author_id);
