
-- Add checkin columns to form_responses
ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS checkin_code text,
  ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid;

-- Create unique index on checkin_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_responses_checkin_code ON public.form_responses(checkin_code) WHERE checkin_code IS NOT NULL;

-- Create unique index on qr_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_responses_qr_token ON public.form_responses(qr_token) WHERE qr_token IS NOT NULL;

-- Function to generate 6-char alphanumeric checkin code
CREATE OR REPLACE FUNCTION public.generate_checkin_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _code text;
  _exists boolean;
BEGIN
  -- Generate a unique 6-char alphanumeric code
  LOOP
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.form_responses WHERE checkin_code = _code) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  
  NEW.checkin_code := _code;
  
  -- Ensure qr_token is set
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_generate_checkin_code
  BEFORE INSERT ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_checkin_code();

-- Backfill existing responses that don't have checkin_code
UPDATE public.form_responses
SET checkin_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE checkin_code IS NULL;
