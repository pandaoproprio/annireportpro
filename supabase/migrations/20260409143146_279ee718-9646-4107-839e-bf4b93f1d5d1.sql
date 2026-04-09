CREATE POLICY "Anon can count registrations for active events"
ON public.event_registrations FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registrations.event_id
      AND events.status = 'ativo'
  )
);