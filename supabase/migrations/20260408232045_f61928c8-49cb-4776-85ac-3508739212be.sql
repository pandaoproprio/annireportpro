
-- Add linked_form_id to events
ALTER TABLE public.events ADD COLUMN linked_form_id uuid REFERENCES public.forms(id) ON DELETE SET NULL;

-- Add registration_number to event_registrations
ALTER TABLE public.event_registrations ADD COLUMN registration_number integer;

-- Function to auto-assign sequential registration number per event
CREATE OR REPLACE FUNCTION public.assign_registration_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(registration_number), 0) + 1
  INTO NEW.registration_number
  FROM public.event_registrations
  WHERE event_id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_assign_registration_number
BEFORE INSERT ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.assign_registration_number();
