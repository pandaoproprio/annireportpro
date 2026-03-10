
-- 1. Auto-assign reviewer trigger: when workflow goes to em_revisao, find a coordinator/analyst for the project
CREATE OR REPLACE FUNCTION public.auto_assign_reviewer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reviewer_id uuid;
BEGIN
  -- Only act when transitioning TO em_revisao
  IF NEW.status != 'em_revisao' OR (OLD IS NOT NULL AND OLD.status = 'em_revisao') THEN
    RETURN NEW;
  END IF;

  -- Skip if already assigned
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find a coordinator or analyst who is a collaborator on this project (not the author)
  SELECT pc.user_id INTO _reviewer_id
  FROM project_collaborators pc
  JOIN user_roles ur ON ur.user_id = pc.user_id
  WHERE pc.project_id = NEW.project_id
    AND pc.user_id != NEW.user_id
    AND ur.role IN ('coordenador', 'analista', 'admin', 'super_admin')
  ORDER BY
    CASE ur.role
      WHEN 'coordenador' THEN 1
      WHEN 'analista' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'super_admin' THEN 4
    END
  LIMIT 1;

  -- Fallback: any admin/super_admin
  IF _reviewer_id IS NULL THEN
    SELECT ur.user_id INTO _reviewer_id
    FROM user_roles ur
    WHERE ur.role IN ('admin', 'super_admin')
      AND ur.user_id != NEW.user_id
    LIMIT 1;
  END IF;

  IF _reviewer_id IS NOT NULL THEN
    NEW.assigned_to := _reviewer_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_reviewer
BEFORE UPDATE ON public.report_workflows
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_reviewer();

-- 2. Performance snapshots table for monthly metrics
CREATE TABLE public.performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  snapshot_month date NOT NULL,
  total_activities integer NOT NULL DEFAULT 0,
  total_reports integer NOT NULL DEFAULT 0,
  avg_lead_time_hours double precision,
  avg_cycle_time_hours double precision,
  rejection_rate double precision,
  sla_compliance_rate double precision,
  workflows_completed integer NOT NULL DEFAULT 0,
  workflows_pending integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, snapshot_month)
);

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage snapshots"
ON public.performance_snapshots FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view project snapshots"
ON public.performance_snapshots FOR SELECT TO authenticated
USING (
  is_project_owner(auth.uid(), project_id)
  OR is_project_collaborator(auth.uid(), project_id)
);
