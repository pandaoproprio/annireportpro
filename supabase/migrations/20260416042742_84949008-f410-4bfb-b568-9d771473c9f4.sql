
-- Fix risk_score_history INSERT policy
DROP POLICY "System and users can insert score history" ON public.risk_score_history;
CREATE POLICY "Users can insert score history for their project risks"
  ON public.risk_score_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_risks pr
      JOIN public.projects p ON p.id = pr.project_id
      WHERE pr.id = risk_id
        AND (p.user_id = auth.uid() OR public.is_project_collaborator(auth.uid(), p.id)
             OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Fix risk_alerts INSERT policy
DROP POLICY "System can insert risk alerts" ON public.risk_alerts;
CREATE POLICY "Users can insert risk alerts for their projects"
  ON public.risk_alerts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_project_collaborator(auth.uid(), project_id)
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );
