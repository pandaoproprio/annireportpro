-- 1) Senha temporária visível ao admin até o primeiro login do usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS temp_password_plaintext text,
  ADD COLUMN IF NOT EXISTS temp_password_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS temp_password_set_by uuid;

-- 2) Tabela de links de reset gerados pelo admin
CREATE TABLE IF NOT EXISTS public.password_reset_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  reset_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_links_user_id ON public.password_reset_links(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_links_created_at ON public.password_reset_links(created_at DESC);

ALTER TABLE public.password_reset_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view reset links" ON public.password_reset_links;
CREATE POLICY "Admins can view reset links"
  ON public.password_reset_links
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3) Limpa a senha temporária automaticamente quando o usuário faz o primeiro login
CREATE OR REPLACE FUNCTION public.clear_temp_password_on_first_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.first_login_at IS NOT NULL AND OLD.first_login_at IS NULL THEN
    NEW.temp_password_plaintext := NULL;
    NEW.temp_password_set_at := NULL;
    NEW.temp_password_set_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_temp_password_on_first_login ON public.profiles;
CREATE TRIGGER trg_clear_temp_password_on_first_login
  BEFORE UPDATE OF first_login_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_temp_password_on_first_login();