
-- Sprint status enum
CREATE TYPE public.sprint_status AS ENUM ('planning', 'active', 'completed', 'cancelled');

-- Sprint item status enum
CREATE TYPE public.sprint_item_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');

-- Sprints table
CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  goal text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status sprint_status NOT NULL DEFAULT 'planning',
  velocity_planned integer NOT NULL DEFAULT 0,
  velocity_completed integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sprints_project ON public.sprints (project_id, status);

CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sprint items (tasks within a sprint)
CREATE TABLE public.sprint_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  story_points integer NOT NULL DEFAULT 1,
  status sprint_item_status NOT NULL DEFAULT 'todo',
  assignee_name text DEFAULT '',
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sprint_items_sprint ON public.sprint_items (sprint_id, status);

CREATE TRIGGER update_sprint_items_updated_at
  BEFORE UPDATE ON public.sprint_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for sprints
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sprints"
  ON public.sprints FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners can view sprints"
  ON public.sprints FOR SELECT TO authenticated
  USING (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Collaborators can view sprints"
  ON public.sprints FOR SELECT TO authenticated
  USING (is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Admins can view all sprints"
  ON public.sprints FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create own sprints"
  ON public.sprints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sprints"
  ON public.sprints FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all sprints"
  ON public.sprints FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete own sprints"
  ON public.sprints FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all sprints"
  ON public.sprints FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS for sprint items
ALTER TABLE public.sprint_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sprint items"
  ON public.sprint_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners can view sprint items"
  ON public.sprint_items FOR SELECT TO authenticated
  USING (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Collaborators can view sprint items"
  ON public.sprint_items FOR SELECT TO authenticated
  USING (is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Admins can view all sprint items"
  ON public.sprint_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create own sprint items"
  ON public.sprint_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sprint items"
  ON public.sprint_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all sprint items"
  ON public.sprint_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete own sprint items"
  ON public.sprint_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all sprint items"
  ON public.sprint_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
