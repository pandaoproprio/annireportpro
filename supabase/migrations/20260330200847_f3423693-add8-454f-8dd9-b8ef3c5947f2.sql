
-- Fix overly permissive INSERT policy - restrict to admins/super_admins
DROP POLICY "Authenticated users can insert login reminders" ON public.login_reminders;

CREATE POLICY "Admins can insert login reminders"
  ON public.login_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );
