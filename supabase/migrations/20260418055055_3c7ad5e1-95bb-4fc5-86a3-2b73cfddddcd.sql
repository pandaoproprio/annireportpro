
-- 1. Add geofence columns to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS geofence_lat numeric,
  ADD COLUMN IF NOT EXISTS geofence_lng numeric,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS pre_checkin_enabled boolean NOT NULL DEFAULT true;

-- 2. Add geofence columns to forms (for forms acting as appointments e.g. Nossa Gente)
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS geofence_lat numeric,
  ADD COLUMN IF NOT EXISTS geofence_lng numeric,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS pre_checkin_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_address text,
  ADD COLUMN IF NOT EXISTS event_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_ends_at timestamptz;

-- 3. Add columns to event_checkins for distance + manual checkin
ALTER TABLE public.event_checkins
  ADD COLUMN IF NOT EXISTS distance_meters numeric,
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_by uuid;

-- 4. Distance helper (Haversine)
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r numeric := 6371000; -- earth radius in meters
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2)
       + cos(radians(lat1)) * cos(radians(lat2))
       * sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN round(r * c, 2);
END;
$$;

-- 5. Pre-checkin table
CREATE TABLE IF NOT EXISTS public.event_pre_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  form_id uuid REFERENCES public.forms(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  response_id uuid REFERENCES public.form_responses(id) ON DELETE CASCADE,
  user_identifier text NOT NULL,
  full_name text NOT NULL,
  channel text NOT NULL DEFAULT 'web',
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pre_checkin_target CHECK (event_id IS NOT NULL OR form_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS event_pre_checkins_event_unique
  ON public.event_pre_checkins (event_id, lower(user_identifier))
  WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_pre_checkins_form_unique
  ON public.event_pre_checkins (form_id, lower(user_identifier))
  WHERE form_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS event_pre_checkins_event_idx ON public.event_pre_checkins(event_id);
CREATE INDEX IF NOT EXISTS event_pre_checkins_form_idx ON public.event_pre_checkins(form_id);

ALTER TABLE public.event_pre_checkins ENABLE ROW LEVEL SECURITY;

-- Public can insert pre-checkins (we trust unique constraint and validation)
CREATE POLICY "Anyone can create pre-checkin"
  ON public.event_pre_checkins
  FOR INSERT
  WITH CHECK (true);

-- Owners of the event/form (and admins) can read
CREATE POLICY "Organizer can view pre-checkins"
  ON public.event_pre_checkins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_pre_checkins.event_id
        AND (e.user_id = auth.uid()
             OR public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'super_admin'::app_role)
             OR public.has_role(auth.uid(), 'coordenador'::app_role)
             OR public.has_role(auth.uid(), 'analista'::app_role))
    )
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = event_pre_checkins.form_id
        AND (f.user_id = auth.uid()
             OR public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'super_admin'::app_role)
             OR public.has_role(auth.uid(), 'coordenador'::app_role)
             OR public.has_role(auth.uid(), 'analista'::app_role))
    )
  );

-- Allow public select by unique identifier (so the participant can confirm their state) 
-- limited to record where target form/event has pre_checkin_enabled true
CREATE POLICY "Public can read own pre-checkin by id"
  ON public.event_pre_checkins
  FOR SELECT
  USING (true);

-- 6. Enable realtime on pre-checkins and ensure event_checkins is realtime
ALTER TABLE public.event_pre_checkins REPLICA IDENTITY FULL;
ALTER TABLE public.event_checkins REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_pre_checkins;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_checkins;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
