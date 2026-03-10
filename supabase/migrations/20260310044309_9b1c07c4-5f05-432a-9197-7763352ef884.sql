
-- GIRA Eventos: events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  event_end_date timestamptz,
  category text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'ativo',
  max_participants integer,
  cover_image_url text,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GIRA Eventos: event_registrations table
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  document text,
  status text NOT NULL DEFAULT 'confirmado',
  registered_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Events RLS: owners can manage their events
CREATE POLICY "Users can create own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own events" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Events RLS: admins can manage all
CREATE POLICY "Admins can manage all events" ON public.events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Events RLS: anon can view active events
CREATE POLICY "Anon can view active events" ON public.events FOR SELECT TO anon USING (status = 'ativo');

-- Registrations RLS: anon can insert into active events
CREATE POLICY "Anyone can register for active events" ON public.event_registrations FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = event_registrations.event_id AND events.status = 'ativo'));

-- Registrations RLS: event owners and admins can view registrations
CREATE POLICY "Event owners can view registrations" ON public.event_registrations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = event_registrations.event_id AND (events.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Registrations RLS: event owners and admins can delete registrations
CREATE POLICY "Event owners can delete registrations" ON public.event_registrations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = event_registrations.event_id AND (events.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Updated_at trigger for events
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
