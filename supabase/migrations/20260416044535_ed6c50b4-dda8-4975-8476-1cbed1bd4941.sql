-- Add PMBOK 7 / Scrumban fields to project_risks
ALTER TABLE public.project_risks 
  ADD COLUMN IF NOT EXISTS risk_owner TEXT,
  ADD COLUMN IF NOT EXISTS linked_goal_id TEXT,
  ADD COLUMN IF NOT EXISTS monetary_impact NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_to TEXT,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_task_created BOOLEAN DEFAULT false;