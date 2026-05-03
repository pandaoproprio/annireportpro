
-- 1) Novos campos de cargo/função e área no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS area_setor text;

-- 2) Restringir defaults para perfis não-administrativos:
--    oficineiro, voluntario e usuario passam a ter APENAS diary (visualizar/criar/editar).
--    Super Admin libera módulos extras individualmente via user_permissions.
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
  ELSIF _role = 'oficineiro' OR _role = 'voluntario' OR _role = 'usuario' THEN
    -- Restritos por padrão: SOMENTE Diário de Bordo
    INSERT INTO public.user_permissions (user_id, permission) VALUES
      (_user_id, 'diary'), (_user_id, 'diary_create'), (_user_id, 'diary_edit');
  END IF;
END;
$function$;

-- 3) Resetar permissões dos usuários atualmente nos perfis restritos (oficineiro/voluntario/usuario)
DO $$
DECLARE _r record;
BEGIN
  FOR _r IN
    SELECT ur.user_id, ur.role
    FROM public.user_roles ur
    WHERE ur.role IN ('oficineiro','voluntario','usuario')
  LOOP
    PERFORM public.populate_default_permissions(_r.user_id, _r.role);
  END LOOP;
END $$;

-- 4) Corrigir cargo da Cintia (mantém papel de acesso Oficineiro)
UPDATE public.profiles
SET cargo = 'Assistente de Comunicação',
    area_setor = COALESCE(area_setor, 'Comunicação')
WHERE email = 'cintiascruzz@gmail.com';
