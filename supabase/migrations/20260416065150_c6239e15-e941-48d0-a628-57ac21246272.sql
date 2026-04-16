-- Table to store Asana boards to monitor
CREATE TABLE public.monitoring_asana_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asana_project_gid TEXT NOT NULL UNIQUE,
  asana_project_name TEXT NOT NULL DEFAULT '',
  asana_workspace_gid TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_asana_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins and admins can manage monitoring boards"
  ON public.monitoring_asana_boards FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );

-- Table to store daily Asana productivity snapshots per user per board
CREATE TABLE public.monitoring_asana_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.monitoring_asana_boards(id) ON DELETE CASCADE,
  asana_user_gid TEXT NOT NULL,
  asana_user_email TEXT,
  asana_user_name TEXT NOT NULL DEFAULT '',
  mapped_user_id UUID,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_created INTEGER NOT NULL DEFAULT 0,
  tasks_on_time INTEGER NOT NULL DEFAULT 0,
  tasks_overdue INTEGER NOT NULL DEFAULT 0,
  subtasks_completed INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, asana_user_gid, snapshot_date)
);

ALTER TABLE public.monitoring_asana_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins and admins can view Asana snapshots"
  ON public.monitoring_asana_snapshots FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role can manage Asana snapshots"
  ON public.monitoring_asana_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_asana_snapshots_date ON public.monitoring_asana_snapshots(snapshot_date);
CREATE INDEX idx_asana_snapshots_mapped_user ON public.monitoring_asana_snapshots(mapped_user_id);

CREATE TRIGGER update_monitoring_asana_boards_updated_at
  BEFORE UPDATE ON public.monitoring_asana_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();