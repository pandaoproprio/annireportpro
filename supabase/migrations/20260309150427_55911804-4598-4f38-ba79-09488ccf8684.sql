
-- Forms table
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Formulário sem título',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'ativo',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Form fields table
CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'short_text',
  label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Form responses table
CREATE TABLE public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_name text,
  respondent_email text,
  answers jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Forms RLS: owners and admins
CREATE POLICY "Users can view own forms" ON public.forms FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all forms" ON public.forms FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can create own forms" ON public.forms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forms" ON public.forms FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all forms" ON public.forms FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can delete own forms" ON public.forms FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete all forms" ON public.forms FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Form fields RLS: access via form ownership
CREATE POLICY "Users can view form fields" ON public.form_fields FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.forms WHERE id = form_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));
CREATE POLICY "Users can manage form fields" ON public.form_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.forms WHERE id = form_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.forms WHERE id = form_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Form responses: public insert (for shared forms), owner/admin read
CREATE POLICY "Anyone can submit responses" ON public.form_responses FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.forms WHERE id = form_id AND status = 'ativo'));
CREATE POLICY "Form owners can view responses" ON public.form_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.forms WHERE id = form_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Indexes
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX idx_forms_user_id ON public.forms(user_id);
