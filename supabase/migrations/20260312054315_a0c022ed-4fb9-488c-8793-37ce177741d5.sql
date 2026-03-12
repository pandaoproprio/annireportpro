-- Add voluntario to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'voluntario';

-- Update populate_default_permissions to handle voluntario (same as oficineiro)
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
      (_user_id, 'project_create'), (_user_id, 'project_delete'),
      (_user_id, 'forms_view'), (_user_id, 'forms_create'), (_user_id, 'forms_edit'), (_user_id, 'forms_delete'), (_user_id, 'forms_export');
  ELSIF _role = 'analista' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'),
      (_user_id, 'report_object'), (_user_id, 'report_object_create'), (_user_id, 'report_object_edit'),
      (_user_id, 'report_team'), (_user_id, 'report_team_create'), (_user_id, 'report_team_edit'),
      (_user_id, 'team_management'),
      (_user_id, 'forms_view'), (_user_id, 'forms_create'), (_user_id, 'forms_edit'), (_user_id, 'forms_export');
  ELSIF _role = 'coordenador' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'), (_user_id, 'diary_delete'),
      (_user_id, 'report_object'), (_user_id, 'report_object_create'), (_user_id, 'report_object_edit'), (_user_id, 'report_object_delete'),
      (_user_id, 'report_team'), (_user_id, 'report_team_create'), (_user_id, 'report_team_edit'), (_user_id, 'report_team_delete'),
      (_user_id, 'forms_view'), (_user_id, 'forms_create'), (_user_id, 'forms_edit');
  ELSIF _role = 'oficineiro' OR _role = 'voluntario' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'),
      (_user_id, 'forms_view');
  ELSIF _role = 'usuario' THEN
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'dashboard'),
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit'),
      (_user_id, 'forms_view');
  END IF;
END;
$function$;

-- Update fill_setor_responsavel to handle voluntario
CREATE OR REPLACE FUNCTION public.fill_setor_responsavel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
  IF NEW.setor_responsavel IS NOT NULL AND NEW.setor_responsavel <> '' THEN
    RETURN NEW;
  END IF;

  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  NEW.setor_responsavel := CASE _role
    WHEN 'super_admin' THEN 'Administração Geral'
    WHEN 'admin' THEN 'Administração'
    WHEN 'analista' THEN 'Setor Técnico'
    WHEN 'coordenador' THEN 'Coordenação de Projeto'
    WHEN 'oficineiro' THEN 'Oficinas / Execução'
    WHEN 'voluntario' THEN 'Voluntariado / Execução'
    ELSE 'Equipe Técnica'
  END;

  RETURN NEW;
END;
$function$;