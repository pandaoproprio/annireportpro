
-- Rate limiting table
CREATE TABLE public.rate_limit_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 minute'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_key ON public.rate_limit_entries (key);
CREATE INDEX idx_rate_limit_expires ON public.rate_limit_entries (expires_at);

ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit entries (edge functions use service role)
CREATE POLICY "Service role full access on rate_limit_entries"
ON public.rate_limit_entries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- LGPD requests table
CREATE TYPE public.lgpd_request_type AS ENUM ('export', 'deletion');
CREATE TYPE public.lgpd_request_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.lgpd_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type public.lgpd_request_type NOT NULL,
  status public.lgpd_request_status NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  download_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own LGPD requests"
ON public.lgpd_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own LGPD requests"
ON public.lgpd_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all LGPD requests"
ON public.lgpd_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Service role full access for edge functions
CREATE POLICY "Service role full access on lgpd_requests"
ON public.lgpd_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_lgpd_requests_updated_at
BEFORE UPDATE ON public.lgpd_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-cleanup function for expired rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_entries WHERE expires_at < now();
$$;
