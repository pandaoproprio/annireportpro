
-- 1. Add project_role_snapshot column to activities
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS project_role_snapshot text;

-- 2. Create function to check if user is a team member of a project
CREATE OR REPLACE FUNCTION public.is_project_team_member_user(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_team_members ptm
    JOIN public.team_members tm ON tm.id = ptm.team_member_id
    WHERE ptm.project_id = _project_id
      AND tm.user_id = _user_id
  )
$$;

-- 3. RLS: Team members can view activities of their project
CREATE POLICY "Team members can view project activities"
ON public.activities
FOR SELECT
USING (
  is_project_team_member_user(auth.uid(), project_id)
  AND deleted_at IS NULL
);

-- 4. RLS: Team members can create activities in their project
CREATE POLICY "Team members can create activities in project"
ON public.activities
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_project_team_member_user(auth.uid(), project_id)
);

-- 5. RLS: Team members can update their own activities
CREATE POLICY "Team members can update own activities"
ON public.activities
FOR UPDATE
USING (
  auth.uid() = user_id
  AND is_project_team_member_user(auth.uid(), project_id)
);
