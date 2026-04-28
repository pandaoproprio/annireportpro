
CREATE TABLE IF NOT EXISTS public.form_errata_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  errata_key text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  resend_id text,
  UNIQUE (form_id, errata_key, recipient_email)
);
ALTER TABLE public.form_errata_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read errata sends" ON public.form_errata_sends
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
