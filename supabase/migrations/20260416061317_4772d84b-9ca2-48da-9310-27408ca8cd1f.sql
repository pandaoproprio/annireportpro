
-- Add new columns to user_productivity_snapshots
ALTER TABLE public.user_productivity_snapshots
  ADD COLUMN IF NOT EXISTS tasks_started integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_finished integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overdue_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concurrent_tasks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_regularity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_avg_activities numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentile_rank numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS user_role text NOT NULL DEFAULT '';

-- Add new columns to monitoring_config
ALTER TABLE public.monitoring_config
  ADD COLUMN IF NOT EXISTS score_weights jsonb NOT NULL DEFAULT '{"engagement":20,"volume":20,"efficiency":20,"quality":20,"consistency":20}'::jsonb,
  ADD COLUMN IF NOT EXISTS productivity_drop_threshold numeric NOT NULL DEFAULT 30;

-- Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'warning',
  snapshot_id uuid REFERENCES public.user_productivity_snapshots(id) ON DELETE SET NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view monitoring alerts"
  ON public.monitoring_alerts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can manage monitoring alerts"
  ON public.monitoring_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_monitoring_alerts_user ON public.monitoring_alerts(user_id);
CREATE INDEX idx_monitoring_alerts_type ON public.monitoring_alerts(alert_type);
CREATE INDEX idx_monitoring_alerts_created ON public.monitoring_alerts(created_at DESC);
