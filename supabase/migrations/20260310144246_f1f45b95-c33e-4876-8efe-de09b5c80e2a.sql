
-- Table to persist daily AI-generated proactive summaries
CREATE TABLE public.proactive_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  summary_type text NOT NULL DEFAULT 'daily',
  ai_model text DEFAULT 'google/gemini-2.5-flash-lite',
  metadata jsonb DEFAULT '{}'::jsonb,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_proactive_summaries_project_date ON public.proactive_summaries (project_id, generated_at DESC);

-- RLS
ALTER TABLE public.proactive_summaries ENABLE ROW LEVEL SECURITY;

-- Admins can view all
CREATE POLICY "Admins can view all proactive summaries"
  ON public.proactive_summaries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Project owners can view their summaries
CREATE POLICY "Project owners can view proactive summaries"
  ON public.proactive_summaries FOR SELECT
  TO authenticated
  USING (is_project_owner(auth.uid(), project_id));

-- Collaborators can view
CREATE POLICY "Collaborators can view proactive summaries"
  ON public.proactive_summaries FOR SELECT
  TO authenticated
  USING (is_project_collaborator(auth.uid(), project_id));

-- Service role inserts (edge function uses service role key)
CREATE POLICY "Service can insert proactive summaries"
  ON public.proactive_summaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nobody can update or delete
CREATE POLICY "Nobody can update proactive summaries"
  ON public.proactive_summaries FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Nobody can delete proactive summaries"
  ON public.proactive_summaries FOR DELETE
  TO authenticated
  USING (false);
