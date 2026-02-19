-- 1. Add password policy columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_attempts_without_change integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Set existing users to NOT require password change (prevent lockout)
UPDATE public.profiles SET must_change_password = false WHERE created_at < now();

-- 2. Create system_logs table
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Immutable: no updates or deletes
CREATE POLICY "Nobody can update system_logs"
  ON public.system_logs FOR UPDATE USING (false);
CREATE POLICY "Nobody can delete system_logs"
  ON public.system_logs FOR DELETE USING (false);

-- Insert: authenticated users can insert their own logs
CREATE POLICY "Users can insert own logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Select: SuperAdmin sees all
CREATE POLICY "SuperAdmin can view all logs"
  ON public.system_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Admin sees operational logs
CREATE POLICY "Admin can view operational logs"
  ON public.system_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Users see own logs
CREATE POLICY "Users can view own logs"
  ON public.system_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Indices
CREATE INDEX idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX idx_system_logs_action ON public.system_logs(action);
CREATE INDEX idx_system_logs_entity ON public.system_logs(entity_type, entity_id);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);