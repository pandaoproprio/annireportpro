-- Fix forms: make anon policy PERMISSIVE
DROP POLICY IF EXISTS "Anon can view active forms" ON public.forms;
CREATE POLICY "Anon can view active forms"
  ON public.forms FOR SELECT
  TO anon
  USING (status = 'ativo'::text);

-- Fix form_fields: make anon policy PERMISSIVE
DROP POLICY IF EXISTS "Anon can view fields of active forms" ON public.form_fields;
CREATE POLICY "Anon can view fields of active forms"
  ON public.form_fields FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_fields.form_id
      AND forms.status = 'ativo'::text
  ));

-- Fix form_responses: make anon insert policy PERMISSIVE
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
CREATE POLICY "Anyone can submit responses"
  ON public.form_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
      AND forms.status = 'ativo'::text
  ));

-- Fix form_notifications: make anon insert policy PERMISSIVE
DROP POLICY IF EXISTS "Insert notifications for form owners" ON public.form_notifications;
CREATE POLICY "Insert notifications for form owners"
  ON public.form_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_notifications.form_id
      AND forms.user_id = form_notifications.recipient_user_id
  ));