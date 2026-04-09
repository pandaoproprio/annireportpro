
-- Allow form owners and admins to delete form responses
CREATE POLICY "Form owners can delete responses"
ON public.form_responses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND (forms.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Allow form owners and admins to delete form notifications
CREATE POLICY "Form owners can delete notifications"
ON public.form_notifications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_notifications.form_id
    AND (forms.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);
