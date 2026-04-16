
-- =============================================
-- 1. risk_suggestions
-- =============================================
CREATE TABLE public.risk_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'outro',
  probability TEXT NOT NULL DEFAULT 'media',
  impact TEXT NOT NULL DEFAULT 'moderado',
  mitigation_plan TEXT NOT NULL DEFAULT '',
  contingency_plan TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'ai_scan',
  source_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_risk_id UUID REFERENCES public.project_risks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project risk suggestions"
  ON public.risk_suggestions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_project_collaborator(auth.uid(), project_id)
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can insert risk suggestions"
  ON public.risk_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_project_collaborator(auth.uid(), project_id)
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can update risk suggestions"
  ON public.risk_suggestions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_project_collaborator(auth.uid(), project_id)
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_risk_suggestions_updated_at
  BEFORE UPDATE ON public.risk_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. risk_score_history
-- =============================================
CREATE TABLE public.risk_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES public.project_risks(id) ON DELETE CASCADE,
  old_score INTEGER NOT NULL DEFAULT 0,
  new_score INTEGER NOT NULL DEFAULT 0,
  old_probability TEXT,
  new_probability TEXT,
  old_impact TEXT,
  new_impact TEXT,
  change_reason TEXT NOT NULL DEFAULT '',
  changed_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view risk score history"
  ON public.risk_score_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_risks pr
      JOIN public.projects p ON p.id = pr.project_id
      WHERE pr.id = risk_id
        AND (p.user_id = auth.uid() OR public.is_project_collaborator(auth.uid(), p.id)
             OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System and users can insert score history"
  ON public.risk_score_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- 3. risk_alerts
-- =============================================
CREATE TABLE public.risk_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES public.project_risks(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'level_increase',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  is_read BOOLEAN NOT NULL DEFAULT false,
  notified_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own risk alerts"
  ON public.risk_alerts FOR SELECT TO authenticated
  USING (notified_user_id = auth.uid());

CREATE POLICY "Users can update their own risk alerts"
  ON public.risk_alerts FOR UPDATE TO authenticated
  USING (notified_user_id = auth.uid());

CREATE POLICY "System can insert risk alerts"
  ON public.risk_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- 4. Add dynamic_score column to project_risks
-- =============================================
ALTER TABLE public.project_risks
  ADD COLUMN IF NOT EXISTS dynamic_score INTEGER,
  ADD COLUMN IF NOT EXISTS last_recalculated_at TIMESTAMPTZ;

-- Index for performance
CREATE INDEX idx_risk_suggestions_project ON public.risk_suggestions(project_id);
CREATE INDEX idx_risk_suggestions_status ON public.risk_suggestions(status);
CREATE INDEX idx_risk_score_history_risk ON public.risk_score_history(risk_id);
CREATE INDEX idx_risk_alerts_user ON public.risk_alerts(notified_user_id, is_read);
CREATE INDEX idx_risk_alerts_project ON public.risk_alerts(project_id);
