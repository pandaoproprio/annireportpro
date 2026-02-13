
-- Add soft delete columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.team_reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_activities_deleted_at ON public.activities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_team_reports_deleted_at ON public.team_reports(deleted_at);

-- Drop and recreate SELECT policies to include deleted_at IS NULL filter

-- PROJECTS
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
CREATE POLICY "Admins can view all projects"
ON public.projects FOR SELECT
USING ((public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Collaborators can view assigned projects" ON public.projects;
CREATE POLICY "Collaborators can view assigned projects"
ON public.projects FOR SELECT
USING (public.is_project_collaborator(auth.uid(), id) AND deleted_at IS NULL);

-- ACTIVITIES
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
CREATE POLICY "Users can view their own activities"
ON public.activities FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
CREATE POLICY "Admins can view all activities"
ON public.activities FOR SELECT
USING ((public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Collaborators can view project activities" ON public.activities;
CREATE POLICY "Collaborators can view project activities"
ON public.activities FOR SELECT
USING (public.is_project_collaborator(auth.uid(), project_id) AND deleted_at IS NULL);

-- TEAM REPORTS
DROP POLICY IF EXISTS "Users can view their own team reports" ON public.team_reports;
CREATE POLICY "Users can view their own team reports"
ON public.team_reports FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all team reports" ON public.team_reports;
CREATE POLICY "Admins can view all team reports"
ON public.team_reports FOR SELECT
USING ((public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) AND deleted_at IS NULL);

-- Replace DELETE policies with soft-delete UPDATE policies
-- Projects: remove hard delete for regular users, keep admin hard delete for cleanup
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can soft delete their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete all projects" ON public.projects;
CREATE POLICY "Admins can soft delete all projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Activities
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;
CREATE POLICY "Users can soft delete their own activities"
ON public.activities FOR UPDATE
USING (auth.uid() = user_id);

-- Team Reports
DROP POLICY IF EXISTS "Users can delete their own team reports" ON public.team_reports;
CREATE POLICY "Users can soft delete their own team reports"
ON public.team_reports FOR UPDATE
USING (auth.uid() = user_id);
