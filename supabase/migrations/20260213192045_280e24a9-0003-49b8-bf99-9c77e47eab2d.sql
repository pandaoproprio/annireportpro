-- Allow admins and super_admins to update all projects
CREATE POLICY "Admins can update all projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Allow admins and super_admins to delete all projects
CREATE POLICY "Admins can delete all projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Allow admins to view all activities
CREATE POLICY "Admins can view all activities"
ON public.activities
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Allow admins to view all team reports
CREATE POLICY "Admins can view all team reports"
ON public.team_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);