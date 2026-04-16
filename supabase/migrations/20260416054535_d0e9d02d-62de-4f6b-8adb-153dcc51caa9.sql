
DROP POLICY "Service can insert snapshots" ON public.user_productivity_snapshots;

CREATE POLICY "Admins can insert snapshots"
  ON public.user_productivity_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete snapshots"
  ON public.user_productivity_snapshots FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  );
