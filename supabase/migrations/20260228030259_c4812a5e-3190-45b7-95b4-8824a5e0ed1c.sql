
-- Add hours columns to report_sla_config
ALTER TABLE public.report_sla_config
  ADD COLUMN default_hours integer NOT NULL DEFAULT 0,
  ADD COLUMN warning_hours integer NOT NULL DEFAULT 0,
  ADD COLUMN escalation_hours integer NOT NULL DEFAULT 0;

-- Update the trigger function to use hours granularity
CREATE OR REPLACE FUNCTION public.update_sla_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _config report_sla_config%ROWTYPE;
  _hours_remaining double precision;
  _warning_total_hours double precision;
  _escalation_total_hours double precision;
  _default_total_hours double precision;
BEGIN
  SELECT * INTO _config FROM report_sla_config WHERE report_type = NEW.report_type AND is_active = true LIMIT 1;
  
  IF _config.id IS NULL THEN
    NEW.status := 'no_prazo';
    RETURN NEW;
  END IF;

  -- Calculate total hours for each threshold
  _default_total_hours := (_config.default_days * 24.0) + _config.default_hours;
  _warning_total_hours := (_config.warning_days * 24.0) + _config.warning_hours;
  _escalation_total_hours := (_config.escalation_days * 24.0) + _config.escalation_hours;

  -- Hours remaining until deadline
  _hours_remaining := EXTRACT(EPOCH FROM (NEW.deadline_at - now())) / 3600.0;

  IF _hours_remaining < (-1 * _escalation_total_hours) THEN
    NEW.status := 'bloqueado';
    IF NEW.blocked_at IS NULL THEN
      NEW.blocked_at := now();
    END IF;
  ELSIF _hours_remaining < 0 THEN
    NEW.status := 'atrasado';
    IF NEW.escalated_at IS NULL THEN
      NEW.escalated_at := now();
    END IF;
  ELSIF _hours_remaining <= _warning_total_hours THEN
    NEW.status := 'atencao';
  ELSE
    NEW.status := 'no_prazo';
  END IF;

  RETURN NEW;
END;
$$;
