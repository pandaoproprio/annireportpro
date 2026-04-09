CREATE OR REPLACE FUNCTION public.generate_checkin_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _exists boolean;
BEGIN
  -- Only generate if not already provided
  IF NEW.checkin_code IS NULL OR NEW.checkin_code = '' THEN
    LOOP
      _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      SELECT EXISTS(SELECT 1 FROM public.form_responses WHERE checkin_code = _code) INTO _exists;
      EXIT WHEN NOT _exists;
    END LOOP;
    NEW.checkin_code := _code;
  END IF;
  
  -- Ensure qr_token is set
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  
  RETURN NEW;
END;
$function$;