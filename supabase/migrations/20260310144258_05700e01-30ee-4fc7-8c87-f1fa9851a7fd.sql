
-- Fix overly permissive INSERT policy - restrict to admins/super_admins
DROP POLICY "Service can insert proactive summaries" ON public.proactive_summaries;

CREATE POLICY "Admins can insert proactive summaries"
  ON public.proactive_summaries FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
