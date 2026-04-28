CREATE POLICY "Admins can view all volunteer terms"
ON public.voluntario_termos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'analista'::app_role)
);