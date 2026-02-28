-- Asana integration config (controlled by super_admin)
CREATE TABLE public.asana_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_gid text NOT NULL DEFAULT '',
  workspace_gid text NOT NULL DEFAULT '',
  enable_create_tasks boolean NOT NULL DEFAULT false,
  enable_sync_status boolean NOT NULL DEFAULT false,
  enable_notifications boolean NOT NULL DEFAULT false,
  enable_import_tasks boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asana_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage asana config"
  ON public.asana_config FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated can view asana config"
  ON public.asana_config FOR SELECT
  USING (true);

-- Mapping between system entities and Asana tasks
CREATE TABLE public.asana_task_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asana_task_gid text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

ALTER TABLE public.asana_task_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage all mappings"
  ON public.asana_task_mappings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all mappings"
  ON public.asana_task_mappings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert own mappings"
  ON public.asana_task_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own mappings"
  ON public.asana_task_mappings FOR SELECT
  USING (auth.uid() = user_id);