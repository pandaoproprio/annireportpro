
-- Function: register_activity_for_user
-- SECURITY DEFINER bypassa o RLS de INSERT, mas valida explicitamente quem pode registrar para quem.
CREATE OR REPLACE FUNCTION public.register_activity_for_user(
  _target_user_id uuid,
  _project_id uuid,
  _date date,
  _end_date date,
  _location text,
  _type activity_type,
  _description text,
  _results text,
  _challenges text,
  _attendees_count int,
  _team_involved text[],
  _photos text[],
  _attachments text[],
  _goal_id uuid,
  _cost_evidence text,
  _is_draft boolean,
  _photo_captions jsonb,
  _attendance_files jsonb,
  _expense_records jsonb,
  _setor_responsavel text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _new_id uuid;
  _is_admin boolean;
  _is_coord boolean;
  _target_role app_role;
  _caller_role app_role;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Mesmo usuário: sempre permitido (cai no fluxo normal)
  IF _caller = _target_user_id THEN
    -- ok
    NULL;
  ELSE
    _is_admin := has_role(_caller, 'admin'::app_role) OR has_role(_caller, 'super_admin'::app_role);
    _is_coord := has_role(_caller, 'coordenador'::app_role);

    IF NOT (_is_admin OR _is_coord) THEN
      RAISE EXCEPTION 'forbidden: only admin/super_admin/coordenador can register for other users';
    END IF;

    -- Coordenador só pode registrar para oficineiro/voluntario/usuario
    IF _is_coord AND NOT _is_admin THEN
      SELECT role INTO _target_role FROM public.user_roles WHERE user_id = _target_user_id LIMIT 1;
      IF _target_role NOT IN ('oficineiro'::app_role, 'voluntario'::app_role, 'usuario'::app_role) THEN
        RAISE EXCEPTION 'forbidden: coordenador can only register for oficineiro/voluntario/usuario';
      END IF;
    END IF;
  END IF;

  -- Snapshot do papel do usuário ALVO (não do caller) para refletir autoria correta
  SELECT role INTO _caller_role FROM public.user_roles WHERE user_id = _target_user_id LIMIT 1;

  INSERT INTO public.activities (
    user_id, project_id, goal_id, date, end_date, location, type,
    description, results, challenges, attendees_count, team_involved,
    photos, attachments, cost_evidence, is_draft, photo_captions,
    attendance_files, expense_records, project_role_snapshot, setor_responsavel
  ) VALUES (
    _target_user_id, _project_id, _goal_id, _date, _end_date, _location, _type,
    _description, COALESCE(_results,''), COALESCE(_challenges,''),
    COALESCE(_attendees_count,0), COALESCE(_team_involved, '{}'::text[]),
    COALESCE(_photos, '{}'::text[]), COALESCE(_attachments, '{}'::text[]),
    _cost_evidence, COALESCE(_is_draft,false), COALESCE(_photo_captions,'{}'::jsonb),
    COALESCE(_attendance_files,'[]'::jsonb), COALESCE(_expense_records,'[]'::jsonb),
    COALESCE(_caller_role::text, NULL), _setor_responsavel
  ) RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_activity_for_user(uuid,uuid,date,date,text,activity_type,text,text,text,int,text[],text[],text[],uuid,text,boolean,jsonb,jsonb,jsonb,text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_activity_for_user(uuid,uuid,date,date,text,activity_type,text,text,text,int,text[],text[],text[],uuid,text,boolean,jsonb,jsonb,jsonb,text) TO authenticated;

-- Function: list_register_targets
-- Lista usuários para os quais o caller pode registrar atividades
CREATE OR REPLACE FUNCTION public.list_register_targets()
RETURNS TABLE(user_id uuid, name text, email text, role app_role)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _is_coord boolean;
BEGIN
  IF _caller IS NULL THEN
    RETURN;
  END IF;

  _is_admin := has_role(_caller, 'admin'::app_role) OR has_role(_caller, 'super_admin'::app_role);
  _is_coord := has_role(_caller, 'coordenador'::app_role);

  IF _is_admin THEN
    RETURN QUERY
      SELECT p.user_id, p.name, p.email, ur.role
      FROM public.profiles p
      LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE COALESCE(p.suspended_at, NULL) IS NULL
      ORDER BY p.name;
  ELSIF _is_coord THEN
    RETURN QUERY
      SELECT p.user_id, p.name, p.email, ur.role
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE ur.role IN ('oficineiro'::app_role, 'voluntario'::app_role, 'usuario'::app_role)
        AND COALESCE(p.suspended_at, NULL) IS NULL
      ORDER BY p.name;
  ELSE
    -- Demais perfis: só ele próprio
    RETURN QUERY
      SELECT p.user_id, p.name, p.email, ur.role
      FROM public.profiles p
      LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = _caller;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_register_targets() FROM public;
GRANT EXECUTE ON FUNCTION public.list_register_targets() TO authenticated;
