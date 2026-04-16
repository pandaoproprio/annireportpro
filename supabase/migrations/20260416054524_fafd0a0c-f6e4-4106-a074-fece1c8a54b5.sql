
-- ══════════════════════════════════════════════════════════════
-- Monitoring Config (singleton-ish, one row for global config)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.monitoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inactive_days_threshold integer NOT NULL DEFAULT 3,
  min_tasks_per_day numeric(6,2) NOT NULL DEFAULT 1,
  max_avg_task_seconds integer NOT NULL DEFAULT 86400,
  report_frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  sla_by_activity_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage monitoring config"
  ON public.monitoring_config FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );

-- Seed default config row
INSERT INTO public.monitoring_config (id) VALUES (gen_random_uuid());

-- ══════════════════════════════════════════════════════════════
-- Monitoring Emails
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.monitoring_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.monitoring_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage monitoring emails"
  ON public.monitoring_emails FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );

-- Seed initial emails
INSERT INTO public.monitoring_emails (email) VALUES
  ('juanpablorj@gmail.com'),
  ('rapha.araujo.cultura@gmail.com');

-- ══════════════════════════════════════════════════════════════
-- User Productivity Snapshots (daily computed metrics)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.user_productivity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  activities_count integer NOT NULL DEFAULT 0,
  avg_task_seconds numeric(12,2) DEFAULT NULL,
  days_inactive integer NOT NULL DEFAULT 0,
  tasks_per_day numeric(6,2) NOT NULL DEFAULT 0,
  sla_violations integer NOT NULL DEFAULT 0,
  sla_total integer NOT NULL DEFAULT 0,
  sla_pct_on_time numeric(5,2) NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.user_productivity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view productivity snapshots"
  ON public.user_productivity_snapshots FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service can insert snapshots"
  ON public.user_productivity_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_productivity_snapshots_date ON public.user_productivity_snapshots(snapshot_date DESC);
CREATE INDEX idx_productivity_snapshots_user ON public.user_productivity_snapshots(user_id, snapshot_date DESC);
