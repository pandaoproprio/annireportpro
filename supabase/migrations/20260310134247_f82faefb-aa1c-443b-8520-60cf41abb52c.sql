
-- Fix overly permissive INSERT policies
DROP POLICY "System can insert automation runs" ON public.automation_runs;
CREATE POLICY "Admins can insert automation runs"
  ON public.automation_runs FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY "System can insert alerts" ON public.automation_alerts;
CREATE POLICY "Admins can insert alerts"
  ON public.automation_alerts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
