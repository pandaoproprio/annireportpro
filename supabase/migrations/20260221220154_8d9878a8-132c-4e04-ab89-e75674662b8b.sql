
-- Create justification_reports table
CREATE TABLE public.justification_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Section 1: Do Objeto do Termo Aditivo
  object_section TEXT NOT NULL DEFAULT '',
  
  -- Section 2: Da Justificativa para a Prorrogação
  justification_section TEXT NOT NULL DEFAULT '',
  
  -- Section 3: Das Ações Já Executadas
  executed_actions_section TEXT NOT NULL DEFAULT '',
  
  -- Section 4: Das Ações Futuras Previstas
  future_actions_section TEXT NOT NULL DEFAULT '',
  
  -- Section 5: Do Prazo Solicitado
  requested_deadline_section TEXT NOT NULL DEFAULT '',
  
  -- Section 6: Anexos
  attachments_section TEXT NOT NULL DEFAULT '',
  
  -- Metadata
  new_deadline_date DATE,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.justification_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own justification reports"
  ON public.justification_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own justification reports"
  ON public.justification_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own justification reports"
  ON public.justification_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own justification reports"
  ON public.justification_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can see all
CREATE POLICY "Admins can view all justification reports"
  ON public.justification_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Collaborators can view
CREATE POLICY "Collaborators can view justification reports"
  ON public.justification_reports FOR SELECT
  USING (is_project_collaborator(auth.uid(), project_id));

-- Trigger for updated_at
CREATE TRIGGER update_justification_reports_updated_at
  BEFORE UPDATE ON public.justification_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
