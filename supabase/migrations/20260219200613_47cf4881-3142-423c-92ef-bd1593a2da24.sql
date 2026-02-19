
-- ============================================
-- FASE 1A: Add enum values + create structure
-- ============================================

-- 1. Add new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analista';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'usuario';

-- 2. Create permission type
DO $$ BEGIN
  CREATE TYPE public.app_permission AS ENUM (
    'dashboard',
    'diary',
    'report_object',
    'report_team',
    'team_management'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission public.app_permission NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "SuperAdmins manage all permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission public.app_permission)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    OR
    EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = _user_id AND permission = _permission)
$$;
