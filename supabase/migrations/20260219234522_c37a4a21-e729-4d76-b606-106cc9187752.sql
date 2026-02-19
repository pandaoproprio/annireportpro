
-- Update populate_default_permissions for coordenador and oficineiro
CREATE OR REPLACE FUNCTION public.populate_default_permissions(_user_id uuid, _role app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.user_permissions WHERE user_id = _user_id;

  IF _role = 'super_admin' THEN
    NULL;
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
  ELSIF _role = 'coordenador' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'), (_user_id, 'diary_delete'),
      (_user_id, 'report_object'), (_user_id, 'report_object_create'), (_user_id, 'report_object_edit'), (_user_id, 'report_object_delete'),
      (_user_id, 'report_team'), (_user_id, 'report_team_create'), (_user_id, 'report_team_edit'), (_user_id, 'report_team_delete');
  ELSIF _role = 'oficineiro' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit');
  ELSIF _role = 'usuario' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit');
  END IF;
END;
$function$;

-- Update get_role_level to include coordenador
CREATE OR REPLACE FUNCTION public.get_role_level(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT CASE role
      WHEN 'super_admin' THEN 5
      WHEN 'admin' THEN 4
      WHEN 'analista' THEN 3
      WHEN 'coordenador' THEN 2
      ELSE 1
    END
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1),
    0
  )
$function$;
