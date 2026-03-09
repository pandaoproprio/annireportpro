
-- Table for form notifications (in-app + email tracking)
CREATE TABLE public.form_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_response_id UUID NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL,
  form_title TEXT NOT NULL DEFAULT '',
  respondent_name TEXT,
  respondent_email TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own form notifications"
ON public.form_notifications FOR SELECT
TO authenticated
USING (auth.uid() = recipient_user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own form notifications"
ON public.form_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_user_id);

-- System can insert notifications (via edge function with service role)
CREATE POLICY "Anyone can insert form notifications"
ON public.form_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Anon can also insert (for public form submissions)
CREATE POLICY "Anon can insert form notifications"
ON public.form_notifications FOR INSERT
TO anon
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_form_notifications_recipient ON public.form_notifications(recipient_user_id, is_read, created_at DESC);

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_notifications;
