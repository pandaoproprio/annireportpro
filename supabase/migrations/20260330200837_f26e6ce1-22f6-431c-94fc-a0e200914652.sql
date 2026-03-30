
-- Table to track login reminder emails sent
CREATE TABLE public.login_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID NOT NULL,
  email_message_id TEXT,
  first_login_at TIMESTAMPTZ,
  notified_admins_at TIMESTAMPTZ
);

ALTER TABLE public.login_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view login reminders"
  ON public.login_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert login reminders"
  ON public.login_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to notify admins when a reminded user logs in for the first time
CREATE OR REPLACE FUNCTION public.notify_first_login_after_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When first_login_at is set on profiles, check if there's a pending reminder
  IF NEW.first_login_at IS NOT NULL AND (OLD.first_login_at IS NULL) THEN
    UPDATE public.login_reminders
    SET first_login_at = NEW.first_login_at
    WHERE user_id = NEW.user_id
      AND first_login_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_first_login_after_reminder
  AFTER UPDATE OF first_login_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_first_login_after_reminder();
