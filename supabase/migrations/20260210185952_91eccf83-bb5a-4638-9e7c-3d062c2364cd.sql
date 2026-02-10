
-- Tabela de membros de equipe (prestadores de serviço)
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT, -- CPF/CNPJ
  function_role TEXT NOT NULL, -- Função/cargo
  email TEXT,
  phone TEXT,
  user_id UUID, -- Vinculado a conta de usuário (quando aprovado para Diário de Bordo)
  created_by UUID NOT NULL, -- Quem criou o registro
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vinculação de membros a projetos
CREATE TABLE public.project_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- RLS for team_members: owners and super_admins can manage
CREATE POLICY "Users can view team members they created"
  ON public.team_members FOR SELECT
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create team members"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their team members"
  ON public.team_members FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their team members"
  ON public.team_members FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS for project_team_members
CREATE POLICY "Users can view project team members"
  ON public.project_team_members FOR SELECT
  USING (
    is_project_owner(auth.uid(), project_id)
    OR is_project_collaborator(auth.uid(), project_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can add team members to their projects"
  ON public.project_team_members FOR INSERT
  WITH CHECK (
    is_project_owner(auth.uid(), project_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can remove team members from their projects"
  ON public.project_team_members FOR DELETE
  USING (
    is_project_owner(auth.uid(), project_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Trigger for updated_at on team_members
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
