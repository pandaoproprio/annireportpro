ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS start_time time without time zone,
ADD COLUMN IF NOT EXISTS end_time time without time zone;

DROP FUNCTION IF EXISTS public.register_activity_for_user(
  uuid, uuid, date, date, text, activity_type, text, text, text, integer,
  text[], text[], text[], uuid, text, boolean, jsonb, jsonb, jsonb, text
);

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
  _attendees_count integer,
  _team_involved text[],
  _photos text[],
  _attachments text[],
  _goal_id text,
  _cost_evidence text,
  _is_draft boolean,
  _photo_captions jsonb,
  _attendance_files jsonb,
  _expense_records jsonb,
  _setor_responsavel text,
  _start_time time without time zone DEFAULT NULL,
  _end_time_value time without time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF _caller = _target_user_id THEN
    NULL;
  ELSE
    _is_admin := has_role(_caller, 'admin'::app_role) OR has_role(_caller, 'super_admin'::app_role);
    _is_coord := has_role(_caller, 'coordenador'::app_role);

    IF NOT (_is_admin OR _is_coord) THEN
      RAISE EXCEPTION 'forbidden: only admin/super_admin/coordenador can register for other users';
    END IF;

    IF _is_coord AND NOT _is_admin THEN
      SELECT role INTO _target_role FROM public.user_roles WHERE user_id = _target_user_id LIMIT 1;
      IF _target_role NOT IN ('oficineiro'::app_role, 'voluntario'::app_role, 'usuario'::app_role) THEN
        RAISE EXCEPTION 'forbidden: coordenador can only register for oficineiro/voluntario/usuario';
      END IF;
    END IF;
  END IF;

  SELECT role INTO _caller_role FROM public.user_roles WHERE user_id = _target_user_id LIMIT 1;

  INSERT INTO public.activities (
    user_id, project_id, goal_id, date, end_date, start_time, end_time, location, type,
    description, results, challenges, attendees_count, team_involved,
    photos, attachments, cost_evidence, is_draft, photo_captions,
    attendance_files, expense_records, project_role_snapshot, setor_responsavel
  ) VALUES (
    _target_user_id, _project_id, NULLIF(_goal_id, ''), _date, _end_date, _start_time, _end_time_value, _location, _type,
    _description, COALESCE(_results,''), COALESCE(_challenges,''),
    COALESCE(_attendees_count,0), COALESCE(_team_involved, '{}'::text[]),
    COALESCE(_photos, '{}'::text[]), COALESCE(_attachments, '{}'::text[]),
    _cost_evidence, COALESCE(_is_draft,false), COALESCE(_photo_captions,'{}'::jsonb),
    COALESCE(_attendance_files,'[]'::jsonb), COALESCE(_expense_records,'[]'::jsonb),
    COALESCE(_caller_role::text, NULL), _setor_responsavel
  ) RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$function$;