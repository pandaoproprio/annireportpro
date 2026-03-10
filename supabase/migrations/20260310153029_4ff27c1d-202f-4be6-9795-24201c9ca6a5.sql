
-- Fix RLS: asana_config - change from public to authenticated
DROP POLICY IF EXISTS "Authenticated can view asana config" ON public.asana_config;
CREATE POLICY "Authenticated can view asana config" ON public.asana_config FOR SELECT TO authenticated USING (true);

-- Fix RLS: report_templates - change from public to authenticated
DROP POLICY IF EXISTS "All users can view active templates" ON public.report_templates;
CREATE POLICY "Authenticated can view active templates" ON public.report_templates FOR SELECT TO authenticated USING (is_active = true);

-- Fix RLS: performance_config - change from public to authenticated
DROP POLICY IF EXISTS "All authenticated can view performance config" ON public.performance_config;
CREATE POLICY "Authenticated can view performance config" ON public.performance_config FOR SELECT TO authenticated USING (true);

-- Fix RLS: report_sla_config - change from public to authenticated
DROP POLICY IF EXISTS "All authenticated can view SLA config" ON public.report_sla_config;
CREATE POLICY "Authenticated can view SLA config" ON public.report_sla_config FOR SELECT TO authenticated USING (is_active = true);
