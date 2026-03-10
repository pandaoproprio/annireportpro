
-- INVOICES TABLE
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  emission_date date NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  observations text DEFAULT '',
  status text NOT NULL DEFAULT 'enviada',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own invoices" ON public.invoices AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own invoices" ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all invoices" ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can update all invoices" ON public.invoices AS RESTRICTIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can update own invoices" ON public.invoices AS RESTRICTIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Project owners can view invoices" ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated USING (is_project_owner(auth.uid(), project_id));
CREATE POLICY "Collaborators can view invoices" ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated USING (is_project_collaborator(auth.uid(), project_id));

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CHAT CHANNELS
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  channel_type text NOT NULL DEFAULT 'project',
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- CHAT CHANNEL MEMBERS
CREATE TABLE public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

-- CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  file_name text,
  file_type text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- CHAT RLS
CREATE POLICY "Members can view channels" ON public.chat_channels AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_channel_members WHERE channel_id = chat_channels.id AND user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can create channels" ON public.chat_channels AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Channel creators and admins can update channels" ON public.chat_channels AS RESTRICTIVE FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Members can view channel members" ON public.chat_channel_members AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_channel_members cm WHERE cm.channel_id = chat_channel_members.channel_id AND cm.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Authorized can add members" ON public.chat_channel_members AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = channel_id AND c.created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR auth.uid() = user_id);
CREATE POLICY "Members can update own membership" ON public.chat_channel_members AS RESTRICTIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authorized can remove members" ON public.chat_channel_members AS RESTRICTIVE FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = channel_id AND c.created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR auth.uid() = user_id);

CREATE POLICY "Members can view messages" ON public.chat_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Members can send messages" ON public.chat_messages AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

CREATE TRIGGER update_chat_channels_updated_at BEFORE UPDATE ON public.chat_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
