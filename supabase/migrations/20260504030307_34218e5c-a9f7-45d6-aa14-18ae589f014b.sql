REVOKE ALL ON FUNCTION public.register_activity_for_user(
  uuid, uuid, date, date, text, activity_type, text, text, text, integer,
  text[], text[], text[], text, text, boolean, jsonb, jsonb, jsonb, text,
  time without time zone, time without time zone
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.register_activity_for_user(
  uuid, uuid, date, date, text, activity_type, text, text, text, integer,
  text[], text[], text[], text, text, boolean, jsonb, jsonb, jsonb, text,
  time without time zone, time without time zone
) FROM anon;

GRANT EXECUTE ON FUNCTION public.register_activity_for_user(
  uuid, uuid, date, date, text, activity_type, text, text, text, integer,
  text[], text[], text[], text, text, boolean, jsonb, jsonb, jsonb, text,
  time without time zone, time without time zone
) TO authenticated;