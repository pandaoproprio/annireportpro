
-- Add QR code token to event_registrations
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create event_checkins table
CREATE TABLE public.event_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  checkin_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkin_method TEXT NOT NULL DEFAULT 'qr_code',
  signature_type TEXT NOT NULL CHECK (signature_type IN ('drawing', 'digital_accept')),
  signature_data TEXT,
  signature_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  document_number TEXT,
  ip_address TEXT,
  user_agent TEXT,
  geolocation JSONB,
  metadata JSONB DEFAULT '{}',
  UNIQUE(registration_id)
);

-- Create event_certificates table
CREATE TABLE public.event_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  checkin_id UUID NOT NULL REFERENCES public.event_checkins(id) ON DELETE CASCADE,
  certificate_hash TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  participant_name TEXT NOT NULL,
  participant_document TEXT,
  event_title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_duration_hours NUMERIC,
  verification_url TEXT,
  UNIQUE(registration_id)
);

-- Enable RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_certificates ENABLE ROW LEVEL SECURITY;

-- Public insert for check-ins (anyone with QR token can check in)
CREATE POLICY "Anyone can create checkins" ON public.event_checkins
  FOR INSERT WITH CHECK (true);

-- Authenticated users can view checkins for their events
CREATE POLICY "Authenticated view checkins" ON public.event_checkins
  FOR SELECT TO authenticated
  USING (
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

-- Public read for certificates (verification)
CREATE POLICY "Anyone can verify certificates" ON public.event_certificates
  FOR SELECT USING (true);

-- Authenticated users can create certificates
CREATE POLICY "Authenticated create certificates" ON public.event_certificates
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for checkins
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_checkins;

-- Indexes
CREATE INDEX idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX idx_event_checkins_registration_id ON public.event_checkins(registration_id);
CREATE INDEX idx_event_certificates_event_id ON public.event_certificates(event_id);
CREATE INDEX idx_event_certificates_hash ON public.event_certificates(certificate_hash);
