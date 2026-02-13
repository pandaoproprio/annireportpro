
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
