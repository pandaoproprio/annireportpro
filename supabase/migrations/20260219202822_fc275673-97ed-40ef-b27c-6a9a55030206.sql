-- Performance indices for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_not_deleted ON public.activities(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON public.projects(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_reports_project_id ON public.team_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON public.project_collaborators(user_id);