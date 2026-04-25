
-- ============ SROI ============
CREATE TABLE public.sroi_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'simplified', -- 'simplified' | 'classic'
  -- Modo simplificado
  proxy_value_per_beneficiary NUMERIC NOT NULL DEFAULT 0,
  beneficiaries_override INTEGER, -- se nulo, soma activities.attendees_count
  total_invested NUMERIC NOT NULL DEFAULT 0, -- snapshot
  total_impact_value NUMERIC NOT NULL DEFAULT 0, -- snapshot
  sroi_ratio NUMERIC NOT NULL DEFAULT 0,
  ai_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sroi_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.sroi_analyses(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  proxy_indicator TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  duration_years NUMERIC NOT NULL DEFAULT 1,
  deadweight_pct NUMERIC NOT NULL DEFAULT 0, -- 0-100
  attribution_pct NUMERIC NOT NULL DEFAULT 100, -- 0-100
  drop_off_pct NUMERIC NOT NULL DEFAULT 0, -- 0-100 ano a ano
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.sroi_analyses(project_id);
CREATE INDEX ON public.sroi_outcomes(analysis_id);

-- ============ TOWS ============
CREATE TABLE public.tows_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb, -- string[]
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  threats JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Estratégias geradas (cruzamentos)
  so_strategies JSONB NOT NULL DEFAULT '[]'::jsonb, -- Strengths × Opportunities
  st_strategies JSONB NOT NULL DEFAULT '[]'::jsonb, -- Strengths × Threats
  wo_strategies JSONB NOT NULL DEFAULT '[]'::jsonb, -- Weaknesses × Opportunities
  wt_strategies JSONB NOT NULL DEFAULT '[]'::jsonb, -- Weaknesses × Threats
  ai_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tows_analyses(project_id);

-- ============ Most Significant Change ============
CREATE TABLE public.msc_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- quem coletou
  storyteller_name TEXT NOT NULL,
  storyteller_role TEXT, -- beneficiário | equipe | parceiro | familiar
  collected_at DATE NOT NULL DEFAULT CURRENT_DATE,
  domain TEXT, -- domínio de mudança (educacional, saúde, social, econômico…)
  story TEXT NOT NULL,
  why_significant TEXT,
  selected_for_report BOOLEAN NOT NULL DEFAULT false,
  selection_notes TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.msc_stories(project_id);

-- ============ RLS ============
ALTER TABLE public.sroi_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sroi_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tows_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msc_stories ENABLE ROW LEVEL SECURITY;

-- Política comum: dono do projeto ou colaborador ou admin
CREATE POLICY "sroi access" ON public.sroi_analyses FOR ALL TO authenticated
  USING (public.is_project_owner(auth.uid(), project_id) OR public.is_project_collaborator(auth.uid(), project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_project_owner(auth.uid(), project_id) OR public.is_project_collaborator(auth.uid(), project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "sroi outcomes access" ON public.sroi_outcomes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sroi_analyses a WHERE a.id = analysis_id AND (public.is_project_owner(auth.uid(), a.project_id) OR public.is_project_collaborator(auth.uid(), a.project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sroi_analyses a WHERE a.id = analysis_id AND (public.is_project_owner(auth.uid(), a.project_id) OR public.is_project_collaborator(auth.uid(), a.project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))));

CREATE POLICY "tows access" ON public.tows_analyses FOR ALL TO authenticated
  USING (public.is_project_owner(auth.uid(), project_id) OR public.is_project_collaborator(auth.uid(), project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_project_owner(auth.uid(), project_id) OR public.is_project_collaborator(auth.uid(), project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "msc access" ON public.msc_stories FOR ALL TO authenticated
  USING (public.is_project_owner(auth.uid(), project_id) OR public.is_project_collaborator(auth.uid(), project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_project_owner(auth.uid(), project_id) OR public.is_project_collaborator(auth.uid(), project_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- updated_at triggers
CREATE TRIGGER trg_sroi_updated BEFORE UPDATE ON public.sroi_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tows_updated BEFORE UPDATE ON public.tows_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_msc_updated BEFORE UPDATE ON public.msc_stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
