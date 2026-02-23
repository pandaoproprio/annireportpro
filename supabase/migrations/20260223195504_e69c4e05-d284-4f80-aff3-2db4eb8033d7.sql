-- Drop all existing restrictive policies on justification_reports
DROP POLICY IF EXISTS "Admins can view all justification reports" ON public.justification_reports;
DROP POLICY IF EXISTS "Collaborators can view justification reports" ON public.justification_reports;
DROP POLICY IF EXISTS "Users can delete their own justification reports" ON public.justification_reports;
DROP POLICY IF EXISTS "Users can insert their own justification reports" ON public.justification_reports;
DROP POLICY IF EXISTS "Users can update their own justification reports" ON public.justification_reports;
DROP POLICY IF EXISTS "Users can view their own justification reports" ON public.justification_reports;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can view their own justification reports"
ON public.justification_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all justification reports"
ON public.justification_reports FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Collaborators can view justification reports"
ON public.justification_reports FOR SELECT
USING (is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Users can insert their own justification reports"
ON public.justification_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own justification reports"
ON public.justification_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmin can update all justification reports"
ON public.justification_reports FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their own justification reports"
ON public.justification_reports FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmin can delete all justification reports"
ON public.justification_reports FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Also fix team_reports - add SuperAdmin update policy
DROP POLICY IF EXISTS "Users can update their own team reports" ON public.team_reports;
DROP POLICY IF EXISTS "Users can soft delete their own team reports" ON public.team_reports;

CREATE POLICY "Users can update their own team reports"
ON public.team_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmin can update all team reports"
ON public.team_reports FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));