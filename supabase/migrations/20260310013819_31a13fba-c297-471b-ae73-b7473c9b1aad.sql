
-- 1. forms: Anon can view active forms → PERMISSIVE
DROP POLICY IF EXISTS "Anon can view active forms" ON public.forms;
CREATE POLICY "Anon can view active forms" ON public.forms
  FOR SELECT TO anon
  USING (status = 'ativo');

-- 2. form_fields: Anon can view fields of active forms → PERMISSIVE
DROP POLICY IF EXISTS "Anon can view fields of active forms" ON public.form_fields;
CREATE POLICY "Anon can view fields of active forms" ON public.form_fields
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM forms WHERE forms.id = form_fields.form_id AND forms.status = 'ativo'
  ));

-- 3. form_responses: Anyone can submit responses → PERMISSIVE
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
CREATE POLICY "Anyone can submit responses" ON public.form_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM forms WHERE forms.id = form_responses.form_id AND forms.status = 'ativo'
  ));

-- 4. form_notifications: Insert notifications for form owners → PERMISSIVE
DROP POLICY IF EXISTS "Insert notifications for form owners" ON public.form_notifications;
CREATE POLICY "Insert notifications for form owners" ON public.form_notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM forms WHERE forms.id = form_notifications.form_id AND forms.user_id = form_notifications.recipient_user_id
  ));
