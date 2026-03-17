
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS closes_at timestamptz DEFAULT NULL;

-- Update RLS: allow anon to view pausado/encerrado forms (to show status message)
DROP POLICY IF EXISTS "Anon can view active forms" ON public.forms;
CREATE POLICY "Anon can view public forms" ON public.forms FOR SELECT TO anon USING (status IN ('ativo', 'pausado', 'encerrado'));

-- Update RLS on form_fields: allow anon to view fields of non-inativo forms
DROP POLICY IF EXISTS "Anon can view fields of active forms" ON public.form_fields;
CREATE POLICY "Anon can view fields of public forms" ON public.form_fields FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM forms WHERE forms.id = form_fields.form_id AND forms.status IN ('ativo', 'pausado', 'encerrado'))
);

-- Update RLS on form_responses: block inserts for non-active forms
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
CREATE POLICY "Anyone can submit responses to active forms" ON public.form_responses FOR INSERT TO anon, authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM forms WHERE forms.id = form_responses.form_id AND forms.status = 'ativo')
);
