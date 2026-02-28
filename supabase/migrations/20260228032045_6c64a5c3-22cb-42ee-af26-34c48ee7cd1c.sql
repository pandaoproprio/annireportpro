
-- Full migration: table + RLS + trigger function + triggers
CREATE TABLE IF NOT EXISTS public.report_performance_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type public.sla_report_type NOT NULL,
  report_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  calculated_lead_time double precision NULL,
  calculated_cycle_time double precision NULL,
  reopen_count integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 3,
  performance_status text NOT NULL DEFAULT 'normal',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_tracking_report ON public.report_performance_tracking (report_type, report_id);

CREATE OR REPLACE TRIGGER update_perf_tracking_updated_at
  BEFORE UPDATE ON public.report_performance_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.report_performance_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance tracking"
  ON public.report_performance_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance tracking"
  ON public.report_performance_tracking FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert own performance tracking"
  ON public.report_performance_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performance tracking"
  ON public.report_performance_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all performance tracking"
  ON public.report_performance_tracking FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Nobody can delete performance tracking"
  ON public.report_performance_tracking FOR DELETE
  USING (false);

CREATE OR REPLACE FUNCTION public.track_report_publication()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _report_type sla_report_type;
  _lead_time double precision;
BEGIN
  IF TG_TABLE_NAME = 'team_reports' THEN
    _report_type := 'report_team';
  ELSIF TG_TABLE_NAME = 'justification_reports' THEN
    _report_type := 'justification';
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.is_draft = true AND NEW.is_draft = false THEN
    _lead_time := EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 3600.0;
    INSERT INTO report_performance_tracking (report_type, report_id, project_id, user_id, published_at, calculated_lead_time)
    VALUES (_report_type, NEW.id, NEW.project_id, NEW.user_id, now(), _lead_time)
    ON CONFLICT (report_type, report_id)
    DO UPDATE SET published_at = now(), calculated_lead_time = _lead_time, updated_at = now();
  END IF;

  IF OLD.is_draft = false AND NEW.is_draft = true THEN
    UPDATE report_performance_tracking
    SET reopen_count = reopen_count + 1, published_at = NULL, updated_at = now()
    WHERE report_type = _report_type AND report_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER track_team_report_publication
  AFTER UPDATE ON public.team_reports
  FOR EACH ROW EXECUTE FUNCTION public.track_report_publication();

CREATE OR REPLACE TRIGGER track_justification_report_publication
  AFTER UPDATE ON public.justification_reports
  FOR EACH ROW EXECUTE FUNCTION public.track_report_publication();
