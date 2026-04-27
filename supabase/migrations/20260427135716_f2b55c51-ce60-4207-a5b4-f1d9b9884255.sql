-- Add per-form sequential registration_number to form_responses
ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS registration_number integer;

-- Backfill existing rows: number by submitted_at order per form
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY form_id ORDER BY submitted_at, id) AS rn
  FROM public.form_responses
)
UPDATE public.form_responses fr
SET registration_number = n.rn
FROM numbered n
WHERE fr.id = n.id AND fr.registration_number IS NULL;

-- Trigger function to assign next registration number per form
CREATE OR REPLACE FUNCTION public.assign_form_registration_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.registration_number IS NULL THEN
    SELECT COALESCE(MAX(registration_number), 0) + 1
    INTO NEW.registration_number
    FROM public.form_responses
    WHERE form_id = NEW.form_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_form_registration_number ON public.form_responses;
CREATE TRIGGER trg_assign_form_registration_number
BEFORE INSERT ON public.form_responses
FOR EACH ROW
EXECUTE FUNCTION public.assign_form_registration_number();

-- Unique index to guarantee no duplicates per form
CREATE UNIQUE INDEX IF NOT EXISTS uq_form_responses_form_regnum
  ON public.form_responses (form_id, registration_number);
