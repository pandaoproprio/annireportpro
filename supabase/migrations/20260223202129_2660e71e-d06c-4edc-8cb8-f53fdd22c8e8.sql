-- Add admin write policies for team_reports
CREATE POLICY "Admins can insert team reports"
ON public.team_reports FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update all team reports"
ON public.team_reports FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add admin write policies for justification_reports
CREATE POLICY "Admins can insert justification reports"
ON public.justification_reports FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update all justification reports"
ON public.justification_reports FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add admin delete policy for justification_reports  
CREATE POLICY "Admins can delete justification reports"
ON public.justification_reports FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);