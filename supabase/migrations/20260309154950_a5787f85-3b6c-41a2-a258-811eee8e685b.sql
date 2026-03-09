
-- Fix overly permissive insert policies
DROP POLICY "Anyone can insert form notifications" ON public.form_notifications;
DROP POLICY "Anon can insert form notifications" ON public.form_notifications;

-- Only allow inserting notifications where recipient is the form owner
CREATE POLICY "Insert notifications for form owners"
ON public.form_notifications FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_notifications.form_id
    AND forms.user_id = form_notifications.recipient_user_id
  )
);
