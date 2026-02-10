-- Fix cross-table recursion: project_collaborators policy references projects, 
-- and projects policy references project_collaborators.
-- Use a security definer function to break the cycle.

CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_collaborator(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = _project_id
      AND user_id = _user_id
  )
$$;

-- Fix projects "Collaborators can view" policy using security definer function
DROP POLICY IF EXISTS "Collaborators can view assigned projects" ON public.projects;
CREATE POLICY "Collaborators can view assigned projects"
ON public.projects
FOR SELECT
USING (public.is_project_collaborator(auth.uid(), id));

-- Fix project_collaborators policies to use security definer function
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;
CREATE POLICY "Project owners can manage collaborators"
ON public.project_collaborators
FOR ALL
USING (public.is_project_owner(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_project_owner(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix activities collaborator policies
DROP POLICY IF EXISTS "Collaborators can view project activities" ON public.activities;
CREATE POLICY "Collaborators can view project activities"
ON public.activities
FOR SELECT
USING (public.is_project_collaborator(auth.uid(), project_id));

DROP POLICY IF EXISTS "Collaborators can create activities in assigned projects" ON public.activities;
CREATE POLICY "Collaborators can create activities in assigned projects"
ON public.activities
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_project_collaborator(auth.uid(), project_id));

DROP POLICY IF EXISTS "Collaborators can update their own activities" ON public.activities;
CREATE POLICY "Collaborators can update their own activities"
ON public.activities
FOR UPDATE
USING (auth.uid() = user_id AND public.is_project_collaborator(auth.uid(), project_id));