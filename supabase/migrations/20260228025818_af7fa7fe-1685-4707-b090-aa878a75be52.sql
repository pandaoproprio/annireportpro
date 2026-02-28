
-- Enum para tipos de relatório com SLA
CREATE TYPE public.sla_report_type AS ENUM ('report_object', 'report_team', 'justification');

-- Enum para status do SLA
CREATE TYPE public.sla_status AS ENUM ('no_prazo', 'atencao', 'atrasado', 'bloqueado');

-- Configuração de SLA por tipo de relatório (admin define)
CREATE TABLE public.report_sla_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type sla_report_type NOT NULL,
  default_days integer NOT NULL DEFAULT 15,
  warning_days integer NOT NULL DEFAULT 10,
  escalation_days integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_type)
);

-- Tracking de SLA por instância de relatório
CREATE TABLE public.report_sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type sla_report_type NOT NULL,
  report_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  deadline_at timestamptz NOT NULL,
  status sla_status NOT NULL DEFAULT 'no_prazo',
  escalated_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_type, report_id)
);

-- Enable RLS
ALTER TABLE public.report_sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sla_tracking ENABLE ROW LEVEL SECURITY;

-- RLS for report_sla_config
CREATE POLICY "Admins can manage SLA config" ON public.report_sla_config
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "All authenticated can view SLA config" ON public.report_sla_config
  FOR SELECT USING (is_active = true);

-- RLS for report_sla_tracking
CREATE POLICY "Users can view own SLA tracking" ON public.report_sla_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all SLA tracking" ON public.report_sla_tracking
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can insert own SLA tracking" ON public.report_sla_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update SLA tracking" ON public.report_sla_tracking
  FOR UPDATE USING (
    auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Nobody can delete SLA tracking" ON public.report_sla_tracking
  FOR DELETE USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_report_sla_config_updated_at
  BEFORE UPDATE ON public.report_sla_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_sla_tracking_updated_at
  BEFORE UPDATE ON public.report_sla_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-calculate SLA status
CREATE OR REPLACE FUNCTION public.update_sla_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _config report_sla_config%ROWTYPE;
  _days_remaining integer;
BEGIN
  SELECT * INTO _config FROM report_sla_config WHERE report_type = NEW.report_type AND is_active = true LIMIT 1;
  
  IF _config.id IS NULL THEN
    NEW.status := 'no_prazo';
    RETURN NEW;
  END IF;

  _days_remaining := EXTRACT(DAY FROM (NEW.deadline_at - now()));

  IF _days_remaining < (-1 * _config.escalation_days) THEN
    NEW.status := 'bloqueado';
    IF NEW.blocked_at IS NULL THEN
      NEW.blocked_at := now();
    END IF;
  ELSIF _days_remaining < 0 THEN
    NEW.status := 'atrasado';
    IF NEW.escalated_at IS NULL THEN
      NEW.escalated_at := now();
    END IF;
  ELSIF _days_remaining <= (_config.default_days - _config.warning_days) THEN
    NEW.status := 'atencao';
  ELSE
    NEW.status := 'no_prazo';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_sla_status
  BEFORE INSERT OR UPDATE ON public.report_sla_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_sla_status();

-- Insert default SLA configs
INSERT INTO public.report_sla_config (report_type, default_days, warning_days, escalation_days, created_by)
VALUES 
  ('report_object', 15, 10, 5, '00000000-0000-0000-0000-000000000000'),
  ('report_team', 15, 10, 5, '00000000-0000-0000-0000-000000000000'),
  ('justification', 15, 10, 5, '00000000-0000-0000-0000-000000000000');
