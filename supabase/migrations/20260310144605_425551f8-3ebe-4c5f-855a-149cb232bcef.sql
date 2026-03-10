
-- Risk classification enums
CREATE TYPE public.risk_probability AS ENUM ('muito_baixa', 'baixa', 'media', 'alta', 'muito_alta');
CREATE TYPE public.risk_impact AS ENUM ('insignificante', 'menor', 'moderado', 'maior', 'catastrofico');
CREATE TYPE public.risk_status AS ENUM ('identificado', 'em_analise', 'mitigando', 'aceito', 'resolvido', 'materializado');
CREATE TYPE public.risk_category AS ENUM ('financeiro', 'operacional', 'cronograma', 'equipe', 'externo', 'legal', 'tecnico', 'outro');

-- Main risks table
CREATE TABLE public.project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category risk_category NOT NULL DEFAULT 'operacional',
  probability risk_probability NOT NULL DEFAULT 'media',
  impact risk_impact NOT NULL DEFAULT 'moderado',
  status risk_status NOT NULL DEFAULT 'identificado',
  mitigation_plan text NOT NULL DEFAULT '',
  contingency_plan text NOT NULL DEFAULT '',
  responsible text,
  due_date date,
  resolved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_risks_project ON public.project_risks (project_id, status);

-- Updated_at trigger
CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON public.project_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project risks"
  ON public.project_risks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners can view risks"
  ON public.project_risks FOR SELECT TO authenticated
  USING (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Collaborators can view risks"
  ON public.project_risks FOR SELECT TO authenticated
  USING (is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Admins can view all risks"
  ON public.project_risks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create own risks"
  ON public.project_risks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risks"
  ON public.project_risks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all risks"
  ON public.project_risks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete own risks"
  ON public.project_risks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all risks"
  ON public.project_risks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
