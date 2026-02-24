
-- ══════════════════════════════════════════════════
-- MÓDULO TEMPLATES DE RELATÓRIOS
-- ══════════════════════════════════════════════════

-- Tabela principal de templates
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personalizado',
  structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  export_config JSONB NOT NULL DEFAULT '{"abnt": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de associação projeto ↔ template
CREATE TABLE public.project_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, template_id)
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_report_templates ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_report_templates_updated_at
  BEFORE UPDATE ON public.project_report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS: report_templates ──

-- SuperAdmin/Admin: full access
CREATE POLICY "Admins can manage all templates"
  ON public.report_templates FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Owner: full CRUD on own templates
CREATE POLICY "Users can view own templates"
  ON public.report_templates FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own templates"
  ON public.report_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates"
  ON public.report_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates"
  ON public.report_templates FOR DELETE
  USING (auth.uid() = created_by);

-- All authenticated users can view active templates (for selection)
CREATE POLICY "All users can view active templates"
  ON public.report_templates FOR SELECT
  USING (is_active = true);

-- ── RLS: project_report_templates ──

-- SuperAdmin/Admin: full access
CREATE POLICY "Admins can manage all project templates"
  ON public.project_report_templates FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Project owners
CREATE POLICY "Project owners can manage project templates"
  ON public.project_report_templates FOR ALL
  USING (is_project_owner(auth.uid(), project_id))
  WITH CHECK (is_project_owner(auth.uid(), project_id));

-- Collaborators can view
CREATE POLICY "Collaborators can view project templates"
  ON public.project_report_templates FOR SELECT
  USING (is_project_collaborator(auth.uid(), project_id));
