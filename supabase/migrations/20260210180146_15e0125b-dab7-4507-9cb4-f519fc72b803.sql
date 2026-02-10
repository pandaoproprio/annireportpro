-- Fix the recursive RLS policy on projects table
DROP POLICY IF EXISTS "Collaborators can view assigned projects" ON public.projects;

CREATE POLICY "Collaborators can view assigned projects"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_collaborators pc
    WHERE pc.project_id = projects.id
      AND pc.user_id = auth.uid()
  )
);