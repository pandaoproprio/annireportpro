
-- Fix: Change anon policies to PERMISSIVE so anonymous users can actually access public forms
-- RESTRICTIVE-only policies deny all access because restrictive policies only narrow permissive grants

-- Drop and recreate anon policy on forms as PERMISSIVE
DROP POLICY IF EXISTS "Anon can view active forms" ON public.forms;
CREATE POLICY "Anon can view active forms"
  ON public.forms FOR SELECT
  TO anon
  USING (status = 'ativo');

-- Drop and recreate anon policy on form_fields as PERMISSIVE  
DROP POLICY IF EXISTS "Anon can view fields of active forms" ON public.form_fields;
CREATE POLICY "Anon can view fields of active forms"
  ON public.form_fields FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM forms WHERE forms.id = form_fields.form_id AND forms.status = 'ativo'
  ));

-- Drop and recreate anon insert policy on form_responses as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
CREATE POLICY "Anyone can submit responses"
  ON public.form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM forms WHERE forms.id = form_responses.form_id AND forms.status = 'ativo'
  ));

-- Drop and recreate anon insert policy on form_notifications as PERMISSIVE
DROP POLICY IF EXISTS "Insert notifications for form owners" ON public.form_notifications;
CREATE POLICY "Insert notifications for form owners"
  ON public.form_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM forms WHERE forms.id = form_notifications.form_id AND forms.user_id = form_notifications.recipient_user_id
  ));
