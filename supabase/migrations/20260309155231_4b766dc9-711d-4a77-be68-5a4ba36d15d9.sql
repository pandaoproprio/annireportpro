
-- Allow anonymous users to view active forms (for public form page)
CREATE POLICY "Anon can view active forms"
ON public.forms FOR SELECT
TO anon
USING (status = 'ativo');

-- Allow anonymous users to view fields of active forms
CREATE POLICY "Anon can view fields of active forms"
ON public.form_fields FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_fields.form_id
    AND forms.status = 'ativo'
  )
);
