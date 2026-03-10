
-- 1. Create workflow_notifications table for in-app notifications
CREATE TABLE public.workflow_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.report_workflows(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by_name text,
  report_type text NOT NULL,
  project_id uuid NOT NULL,
  report_id uuid NOT NULL,
  notes text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own workflow notifications"
  ON public.workflow_notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can update own workflow notifications"
  ON public.workflow_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "System can insert workflow notifications"
  ON public.workflow_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Nobody can delete workflow notifications"
  ON public.workflow_notifications FOR DELETE TO authenticated
  USING (false);

-- 2. Enable realtime for workflow_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_notifications;

-- 3. Create DB function to auto-insert notifications on workflow status change
CREATE OR REPLACE FUNCTION public.notify_workflow_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _changed_by_name text;
  _recipients uuid[];
  _rid uuid;
BEGIN
  -- Only fire if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get name of the user who changed status
  SELECT name INTO _changed_by_name
  FROM public.profiles
  WHERE user_id = NEW.status_changed_by
  LIMIT 1;

  -- Build recipient list: owner + assigned_to (excluding the person who made the change)
  _recipients := ARRAY[]::uuid[];
  
  IF NEW.user_id IS NOT NULL AND NEW.user_id != NEW.status_changed_by THEN
    _recipients := _recipients || NEW.user_id;
  END IF;
  
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.status_changed_by AND NEW.assigned_to != NEW.user_id THEN
    _recipients := _recipients || NEW.assigned_to;
  END IF;

  -- Insert notification for each recipient
  FOREACH _rid IN ARRAY _recipients LOOP
    INSERT INTO public.workflow_notifications (
      workflow_id, recipient_user_id, from_status, to_status,
      changed_by_name, report_type, project_id, report_id, notes
    ) VALUES (
      NEW.id, _rid, OLD.status::text, NEW.status::text,
      COALESCE(_changed_by_name, 'Sistema'), NEW.report_type::text,
      NEW.project_id, NEW.report_id, NEW.notes
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger to report_workflows
CREATE TRIGGER trg_workflow_notification
  AFTER UPDATE ON public.report_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_transition();
