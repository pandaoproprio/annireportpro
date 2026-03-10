
-- Fix overly permissive INSERT policy - restrict to trigger-inserted rows
DROP POLICY "System can insert workflow notifications" ON public.workflow_notifications;

CREATE POLICY "Trigger inserts workflow notifications"
  ON public.workflow_notifications FOR INSERT TO authenticated
  WITH CHECK (
    -- Only allow if the workflow exists and the recipient is the workflow owner or assigned_to
    EXISTS (
      SELECT 1 FROM public.report_workflows w
      WHERE w.id = workflow_notifications.workflow_id
        AND (w.user_id = workflow_notifications.recipient_user_id OR w.assigned_to = workflow_notifications.recipient_user_id)
    )
  );
