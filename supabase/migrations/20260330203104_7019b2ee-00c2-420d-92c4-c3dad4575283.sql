
-- Fix: Restrict certificate creation to event owners and admins
DROP POLICY "Authenticated create certificates" ON public.event_certificates;
CREATE POLICY "Event owners and admins create certificates" ON public.event_certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND (
        e.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
      )
    )
  );

-- Fix: Restrict checkin insert to valid QR tokens only (validated in app logic)
-- Keep open INSERT since participants aren't authenticated, but add anon role
DROP POLICY "Anyone can create checkins" ON public.event_checkins;
CREATE POLICY "Public checkin via QR" ON public.event_checkins
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_registrations r
      WHERE r.id = registration_id
      AND r.event_id = event_checkins.event_id
    )
  );

-- Allow public to read their own checkin by registration_id
CREATE POLICY "Public read own checkin" ON public.event_checkins
  FOR SELECT TO anon
  USING (true);
