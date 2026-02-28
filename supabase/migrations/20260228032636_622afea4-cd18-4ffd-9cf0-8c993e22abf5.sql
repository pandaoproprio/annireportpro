
CREATE TABLE IF NOT EXISTS public.performance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stale_draft_threshold_hours integer NOT NULL DEFAULT 168,
  wip_limit integer NOT NULL DEFAULT 5,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER update_performance_config_updated_at
  BEFORE UPDATE ON public.performance_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.performance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage performance config"
  ON public.performance_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "All authenticated can view performance config"
  ON public.performance_config FOR SELECT
  USING (true);

-- Insert default config row
INSERT INTO public.performance_config (stale_draft_threshold_hours, wip_limit, created_by)
VALUES (168, 5, '00000000-0000-0000-0000-000000000000');
