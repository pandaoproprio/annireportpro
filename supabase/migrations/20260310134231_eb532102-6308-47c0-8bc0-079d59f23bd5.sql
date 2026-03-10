
-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role (required for pg_cron)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Table to track automation runs
CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'monitor',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  alerts_generated integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,
  errors text[],
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view automation runs"
  ON public.automation_runs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert automation runs"
  ON public.automation_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Nobody can update automation runs"
  ON public.automation_runs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Nobody can delete automation runs"
  ON public.automation_runs FOR DELETE
  TO authenticated
  USING (false);

-- Table to store automation alerts
CREATE TABLE public.automation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_user_id uuid NOT NULL,
  target_email text,
  entity_type text,
  entity_id uuid,
  project_id uuid,
  email_sent boolean NOT NULL DEFAULT false,
  email_error text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON public.automation_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

CREATE POLICY "Admins can view all alerts"
  ON public.automation_alerts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert alerts"
  ON public.automation_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can mark own alerts as read"
  ON public.automation_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = target_user_id);

CREATE POLICY "Nobody can delete alerts"
  ON public.automation_alerts FOR DELETE
  TO authenticated
  USING (false);

-- Index for fast queries
CREATE INDEX idx_automation_alerts_user ON public.automation_alerts(target_user_id, is_read);
CREATE INDEX idx_automation_alerts_type ON public.automation_alerts(alert_type, created_at DESC);
CREATE INDEX idx_automation_runs_status ON public.automation_runs(status, started_at DESC);
