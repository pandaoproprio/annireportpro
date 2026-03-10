-- Fix overly permissive policy: restrict updates to admins only
DROP POLICY IF EXISTS "Service can update automation runs" ON public.automation_runs;

CREATE POLICY "Admins can update automation runs"
ON public.automation_runs
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);