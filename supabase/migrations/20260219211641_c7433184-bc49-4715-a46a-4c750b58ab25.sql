
-- Add granular CRUD permissions per module
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'diary_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'diary_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'diary_delete';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'report_object_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'report_object_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'report_object_delete';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'report_team_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'report_team_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'report_team_delete';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'team_management_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'team_management_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'team_management_delete';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'user_management';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'user_management_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'user_management_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'user_management_delete';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'system_logs';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'settings_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'project_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'project_delete';

-- Update populate_default_permissions with granular CRUD
CREATE OR REPLACE FUNCTION public.populate_default_permissions(_user_id uuid, _role app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.user_permissions WHERE user_id = _user_id;

  IF _role = 'super_admin' THEN
    NULL; -- bypass via has_permission
  ELSIF _role = 'admin' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'), (_user_id, 'diary_delete'),
      (_user_id, 'report_object'), (_user_id, 'report_object_create'), (_user_id, 'report_object_edit'), (_user_id, 'report_object_delete'),
      (_user_id, 'report_team'), (_user_id, 'report_team_create'), (_user_id, 'report_team_edit'), (_user_id, 'report_team_delete'),
      (_user_id, 'team_management'), (_user_id, 'team_management_create'), (_user_id, 'team_management_edit'), (_user_id, 'team_management_delete'),
      (_user_id, 'user_management'), (_user_id, 'user_management_create'), (_user_id, 'user_management_edit'), (_user_id, 'user_management_delete'),
      (_user_id, 'system_logs'),
      (_user_id, 'settings_edit'),
      (_user_id, 'project_create'), (_user_id, 'project_delete');
  ELSIF _role = 'analista' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'),
      (_user_id, 'report_object'), (_user_id, 'report_object_create'), (_user_id, 'report_object_edit'),
      (_user_id, 'report_team'), (_user_id, 'report_team_create'), (_user_id, 'report_team_edit'),
      (_user_id, 'team_management');
  ELSIF _role = 'usuario' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit');
  END IF;
END;
$function$;
