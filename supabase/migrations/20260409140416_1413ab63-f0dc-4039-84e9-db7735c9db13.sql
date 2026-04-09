-- Allow anonymous users to check for duplicate submissions on active forms
-- This is needed so the duplicate-check logic in PublicFormPage works for public visitors
CREATE POLICY "Anon can check own submissions on active forms"
ON public.form_responses
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
      AND forms.status = 'ativo'
  )
);