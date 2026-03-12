
CREATE TABLE public.form_digest_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  recipients text[] NOT NULL DEFAULT '{}',
  frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(form_id)
);

ALTER TABLE public.form_digest_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form owners can manage digest config" ON public.form_digest_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_digest_config.form_id
        AND (forms.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_digest_config.form_id
        AND (forms.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );
