-- Allow updates on automation_alerts (for email_sent/email_error tracking)
DROP POLICY IF EXISTS "Nobody can update automation alerts" ON public.automation_alerts;

CREATE POLICY "Admins can update automation alerts"
ON public.automation_alerts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR auth.uid() = target_user_id
);

-- Allow service role to update automation_runs (for finalizing runs from edge function)
DROP POLICY IF EXISTS "Nobody can update automation runs" ON public.automation_runs;

CREATE POLICY "Service can update automation runs"
ON public.automation_runs
FOR UPDATE
USING (true);