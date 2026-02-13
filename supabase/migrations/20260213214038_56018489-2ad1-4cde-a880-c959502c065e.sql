
-- Create RLS policies for viewing soft-deleted items (own items only)
CREATE POLICY "Users can view their own deleted projects"
ON public.projects
FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Users can view their own deleted activities"
ON public.activities
FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Users can view their own deleted team reports"
ON public.team_reports
FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);
