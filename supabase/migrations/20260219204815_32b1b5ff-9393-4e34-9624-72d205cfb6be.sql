
-- Function to get role level (higher = more privileged)
CREATE OR REPLACE FUNCTION public.get_role_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE role
      WHEN 'super_admin' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'analista' THEN 2
      ELSE 1
    END
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1),
    0
  )
$$;

-- Drop existing SELECT policies on system_logs
DROP POLICY IF EXISTS "SuperAdmin can view all logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admin can view operational logs" ON public.system_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.system_logs;

-- SuperAdmin sees ALL logs (including other SuperAdmin and Admin)
CREATE POLICY "SuperAdmin can view all logs"
  ON public.system_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Admin (Coordenador) sees own logs + analista + usuario/oficineiro logs
-- Cannot see SuperAdmin or other Admin logs
CREATE POLICY "Admin can view lower role logs"
  ON public.system_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    AND (
      user_id = auth.uid()
      OR get_role_level(user_id) <= 2
    )
  );

-- Analista sees own logs + usuario/oficineiro logs
CREATE POLICY "Analista can view lower role logs"
  ON public.system_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'analista')
    AND (
      user_id = auth.uid()
      OR get_role_level(user_id) <= 1
    )
  );

-- Usuario/Oficineiro: NO SELECT policy = no access to logs

-- Add modified_by column to track who performed the action (name for display)
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS modified_by_name text;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS modified_by_email text;
