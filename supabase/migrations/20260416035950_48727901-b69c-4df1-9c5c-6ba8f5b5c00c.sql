
-- 1. New table: asana_synced_projects
CREATE TABLE public.asana_synced_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asana_project_gid text NOT NULL,
  asana_project_name text NOT NULL DEFAULT '',
  workspace_gid text NOT NULL DEFAULT '',
  sync_status text NOT NULL DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error')),
  last_synced_at timestamptz,
  last_error text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asana_project_gid)
);

ALTER TABLE public.asana_synced_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage synced projects"
  ON public.asana_synced_projects FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view synced projects"
  ON public.asana_synced_projects FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_asana_synced_projects_updated_at
  BEFORE UPDATE ON public.asana_synced_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. New table: asana_sync_logs
CREATE TABLE public.asana_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_project_id uuid REFERENCES public.asana_synced_projects(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'asana_to_gira' CHECK (direction IN ('asana_to_gira', 'gira_to_asana')),
  event_type text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_id text,
  asana_task_gid text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asana_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.asana_sync_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Index for fast log queries
CREATE INDEX idx_asana_sync_logs_project ON public.asana_sync_logs(synced_project_id, created_at DESC);

-- 3. Alter asana_config: add global toggle
ALTER TABLE public.asana_config ADD COLUMN IF NOT EXISTS is_globally_enabled boolean NOT NULL DEFAULT true;

-- 4. Alter asana_task_mappings: add project tracking and conflict resolution
ALTER TABLE public.asana_task_mappings ADD COLUMN IF NOT EXISTS asana_project_gid text;
ALTER TABLE public.asana_task_mappings ADD COLUMN IF NOT EXISTS last_remote_update timestamptz;
