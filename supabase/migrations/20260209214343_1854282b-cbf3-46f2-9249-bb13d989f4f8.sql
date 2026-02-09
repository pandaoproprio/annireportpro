
-- Tabela para vincular colaboradores externos a projetos
CREATE TABLE public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborators can see their own assignments
CREATE POLICY "Collaborators can view their assignments"
ON public.project_collaborators
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Project owners and super_admins can manage collaborators
CREATE POLICY "Project owners can manage collaborators"
ON public.project_collaborators
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Allow collaborators to view the projects they're assigned to (read-only)
CREATE POLICY "Collaborators can view assigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.project_collaborators WHERE project_id = id AND user_id = auth.uid())
);

-- Allow collaborators to view activities of their assigned projects
CREATE POLICY "Collaborators can view project activities"
ON public.activities
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.project_collaborators WHERE project_id = activities.project_id AND user_id = auth.uid())
);

-- Allow collaborators to create activities in assigned projects
CREATE POLICY "Collaborators can create activities in assigned projects"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.project_collaborators WHERE project_id = activities.project_id AND user_id = auth.uid())
);

-- Allow collaborators to update their own activities
CREATE POLICY "Collaborators can update their own activities"
ON public.activities
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.project_collaborators WHERE project_id = activities.project_id AND user_id = auth.uid())
);
