
-- 1. Blindar audit_logs: impedir UPDATE e DELETE
CREATE POLICY "Nobody can update audit logs"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Nobody can delete audit logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

-- 2. Impedir hard DELETE em projects, activities e team_reports
CREATE POLICY "Nobody can hard delete projects"
ON public.projects
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "Nobody can hard delete activities"
ON public.activities
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "Nobody can hard delete team reports"
ON public.team_reports
FOR DELETE
TO authenticated
USING (false);
