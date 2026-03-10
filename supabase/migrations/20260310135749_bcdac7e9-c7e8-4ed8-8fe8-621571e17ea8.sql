-- 1. Workflow status enum
CREATE TYPE public.workflow_status AS ENUM (
  'rascunho',
  'em_revisao',
  'aprovado',
  'publicado',
  'devolvido'
);

-- 2. Workflow tracking table
CREATE TABLE public.report_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  report_type public.sla_report_type NOT NULL,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status public.workflow_status NOT NULL DEFAULT 'rascunho',
  assigned_to UUID,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  escalated_at TIMESTAMP WITH TIME ZONE,
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, report_type)
);

ALTER TABLE public.report_workflows ENABLE ROW LEVEL SECURITY;

-- 3. Workflow history (immutable audit trail)
CREATE TABLE public.report_workflow_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.report_workflows(id) ON DELETE CASCADE,
  from_status public.workflow_status,
  to_status public.workflow_status NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_workflow_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for report_workflows
CREATE POLICY "Users can view own workflows"
ON public.report_workflows FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Admins can view all workflows"
ON public.report_workflows FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create own workflows"
ON public.report_workflows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows"
ON public.report_workflows FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = assigned_to
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Nobody can delete workflows"
ON public.report_workflows FOR DELETE TO authenticated
USING (false);

-- 5. RLS for workflow history
CREATE POLICY "Users can view own workflow history"
ON public.report_workflow_history FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.report_workflows w
  WHERE w.id = report_workflow_history.workflow_id
  AND (w.user_id = auth.uid() OR w.assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
));

CREATE POLICY "Authenticated can insert workflow history"
ON public.report_workflow_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Nobody can update workflow history"
ON public.report_workflow_history FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "Nobody can delete workflow history"
ON public.report_workflow_history FOR DELETE TO authenticated
USING (false);

-- 6. State machine validation function
CREATE OR REPLACE FUNCTION public.validate_workflow_transition(
  _current_status workflow_status,
  _new_status workflow_status,
  _user_id UUID
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Define valid transitions
  -- rascunho → em_revisao (author submits)
  -- em_revisao → aprovado (reviewer approves)
  -- em_revisao → devolvido (reviewer returns)
  -- devolvido → em_revisao (author resubmits)
  -- aprovado → publicado (admin publishes)
  -- publicado → rascunho (admin reopens — exceptional)

  IF _current_status = 'rascunho' AND _new_status = 'em_revisao' THEN RETURN true; END IF;
  IF _current_status = 'em_revisao' AND _new_status = 'aprovado' THEN
    RETURN has_role(_user_id, 'admin'::app_role)
        OR has_role(_user_id, 'super_admin'::app_role)
        OR has_role(_user_id, 'coordenador'::app_role)
        OR has_role(_user_id, 'analista'::app_role);
  END IF;
  IF _current_status = 'em_revisao' AND _new_status = 'devolvido' THEN
    RETURN has_role(_user_id, 'admin'::app_role)
        OR has_role(_user_id, 'super_admin'::app_role)
        OR has_role(_user_id, 'coordenador'::app_role)
        OR has_role(_user_id, 'analista'::app_role);
  END IF;
  IF _current_status = 'devolvido' AND _new_status = 'em_revisao' THEN RETURN true; END IF;
  IF _current_status = 'aprovado' AND _new_status = 'publicado' THEN
    RETURN has_role(_user_id, 'admin'::app_role)
        OR has_role(_user_id, 'super_admin'::app_role);
  END IF;
  IF _current_status = 'publicado' AND _new_status = 'rascunho' THEN
    RETURN has_role(_user_id, 'super_admin'::app_role);
  END IF;

  RETURN false;
END;
$$;

-- 7. Trigger to update updated_at
CREATE TRIGGER update_report_workflows_updated_at
BEFORE UPDATE ON public.report_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable realtime for workflow updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_workflows;