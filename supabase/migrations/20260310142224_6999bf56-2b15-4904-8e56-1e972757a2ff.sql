
-- Table to store AI-generated institutional narratives from diary entries
CREATE TABLE public.activity_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  narrative_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovado', 'rejeitado')),
  ai_model text,
  generation_prompt_summary text,
  edited_by uuid,
  edited_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  target_reports text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id)
);

ALTER TABLE public.activity_narratives ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage all narratives"
ON public.activity_narratives FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Users can manage own
CREATE POLICY "Users can view own narratives"
ON public.activity_narratives FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own narratives"
ON public.activity_narratives FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own narratives"
ON public.activity_narratives FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Collaborators can view project narratives
CREATE POLICY "Collaborators can view project narratives"
ON public.activity_narratives FOR SELECT TO authenticated
USING (is_project_collaborator(auth.uid(), project_id));

-- Team members can view project narratives
CREATE POLICY "Team members can view project narratives"
ON public.activity_narratives FOR SELECT TO authenticated
USING (is_project_team_member_user(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_activity_narratives_updated_at
BEFORE UPDATE ON public.activity_narratives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
