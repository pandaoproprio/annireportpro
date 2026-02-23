
-- ============================================================
-- FIX: Convert RESTRICTIVE policies to PERMISSIVE on team_reports
-- ============================================================

-- SELECT policies
DROP POLICY IF EXISTS "Admins can view all team reports" ON public.team_reports;
DROP POLICY IF EXISTS "Users can view their own team reports" ON public.team_reports;
DROP POLICY IF EXISTS "Users can view their own deleted team reports" ON public.team_reports;

CREATE POLICY "Users can view their own team reports"
ON public.team_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view their own deleted team reports"
ON public.team_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view all team reports"
ON public.team_reports FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) AND deleted_at IS NULL);

-- INSERT policy
DROP POLICY IF EXISTS "Users can create their own team reports" ON public.team_reports;
CREATE POLICY "Users can create their own team reports"
ON public.team_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE policies
DROP POLICY IF EXISTS "Users can update their own team reports" ON public.team_reports;
DROP POLICY IF EXISTS "SuperAdmin can update all team reports" ON public.team_reports;

CREATE POLICY "Users can update their own team reports"
ON public.team_reports FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmin can update all team reports"
ON public.team_reports FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- DELETE policy (keep restrictive - nobody can hard delete)
DROP POLICY IF EXISTS "Nobody can hard delete team reports" ON public.team_reports;
CREATE POLICY "Nobody can hard delete team reports"
ON public.team_reports FOR DELETE TO authenticated
USING (false);

-- ============================================================
-- FIX: Convert RESTRICTIVE policies to PERMISSIVE on activities
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view their own deleted activities" ON public.activities;
DROP POLICY IF EXISTS "Collaborators can view project activities" ON public.activities;
DROP POLICY IF EXISTS "Users can create their own activities" ON public.activities;
DROP POLICY IF EXISTS "Collaborators can create activities in assigned projects" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can soft delete their own activities" ON public.activities;
DROP POLICY IF EXISTS "Collaborators can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Nobody can hard delete activities" ON public.activities;

CREATE POLICY "Users can view their own activities"
ON public.activities FOR SELECT TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view their own deleted activities"
ON public.activities FOR SELECT TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view all activities"
ON public.activities FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) AND deleted_at IS NULL);

CREATE POLICY "Collaborators can view project activities"
ON public.activities FOR SELECT TO authenticated
USING (is_project_collaborator(auth.uid(), project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create their own activities"
ON public.activities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaborators can create activities in assigned projects"
ON public.activities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Users can update their own activities"
ON public.activities FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can update their own activities"
ON public.activities FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Nobody can hard delete activities"
ON public.activities FOR DELETE TO authenticated
USING (false);

-- ============================================================
-- FIX: Convert RESTRICTIVE policies to PERMISSIVE on projects
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own deleted projects" ON public.projects;
DROP POLICY IF EXISTS "Collaborators can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can soft delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can soft delete all projects" ON public.projects;
DROP POLICY IF EXISTS "Nobody can hard delete projects" ON public.projects;

CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view their own deleted projects"
ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view all projects"
ON public.projects FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) AND deleted_at IS NULL);

CREATE POLICY "Collaborators can view assigned projects"
ON public.projects FOR SELECT TO authenticated
USING (is_project_collaborator(auth.uid(), id) AND deleted_at IS NULL);

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all projects"
ON public.projects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Nobody can hard delete projects"
ON public.projects FOR DELETE TO authenticated
USING (false);

-- ============================================================
-- FIX: Convert RESTRICTIVE policies to PERMISSIVE on remaining tables
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- user_permissions
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "SuperAdmins manage all permissions" ON public.user_permissions;

CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins manage all permissions"
ON public.user_permissions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- audit_logs
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Nobody can delete audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Nobody can update audit logs" ON public.audit_logs;

CREATE POLICY "Users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Nobody can delete audit logs"
ON public.audit_logs FOR DELETE TO authenticated
USING (false);

CREATE POLICY "Nobody can update audit logs"
ON public.audit_logs FOR UPDATE TO authenticated
USING (false);

-- system_logs
DROP POLICY IF EXISTS "SuperAdmin can view all logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admin can view lower role logs" ON public.system_logs;
DROP POLICY IF EXISTS "Analista can view lower role logs" ON public.system_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.system_logs;
DROP POLICY IF EXISTS "Nobody can delete system_logs" ON public.system_logs;
DROP POLICY IF EXISTS "Nobody can update system_logs" ON public.system_logs;

CREATE POLICY "SuperAdmin can view all logs"
ON public.system_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin can view lower role logs"
ON public.system_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND (user_id = auth.uid() OR get_role_level(user_id) <= 2));

CREATE POLICY "Analista can view lower role logs"
ON public.system_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'analista') AND (user_id = auth.uid() OR get_role_level(user_id) <= 1));

CREATE POLICY "Users can insert own logs"
ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nobody can delete system_logs"
ON public.system_logs FOR DELETE TO authenticated
USING (false);

CREATE POLICY "Nobody can update system_logs"
ON public.system_logs FOR UPDATE TO authenticated
USING (false);

-- project_collaborators
DROP POLICY IF EXISTS "Collaborators can view their assignments" ON public.project_collaborators;
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;

CREATE POLICY "Collaborators can view their assignments"
ON public.project_collaborators FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Project owners can manage collaborators"
ON public.project_collaborators FOR ALL TO authenticated
USING (is_project_owner(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin'))
WITH CHECK (is_project_owner(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin'));

-- team_members
DROP POLICY IF EXISTS "Users can create team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members they created" ON public.team_members;
DROP POLICY IF EXISTS "Users can update their team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete their team members" ON public.team_members;

CREATE POLICY "Users can view team members they created"
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create team members"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their team members"
ON public.team_members FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can delete their team members"
ON public.team_members FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));

-- project_team_members
DROP POLICY IF EXISTS "Users can view project team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Users can add team members to their projects" ON public.project_team_members;
DROP POLICY IF EXISTS "Users can remove team members from their projects" ON public.project_team_members;

CREATE POLICY "Users can view project team members"
ON public.project_team_members FOR SELECT TO authenticated
USING (is_project_owner(auth.uid(), project_id) OR is_project_collaborator(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can add team members to their projects"
ON public.project_team_members FOR INSERT TO authenticated
WITH CHECK (is_project_owner(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can remove team members from their projects"
ON public.project_team_members FOR DELETE TO authenticated
USING (is_project_owner(auth.uid(), project_id) OR has_role(auth.uid(), 'super_admin'));
