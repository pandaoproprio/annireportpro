
-- Budget categories enum
CREATE TYPE public.budget_category AS ENUM (
  'pessoal', 'material', 'servicos', 'infraestrutura', 'comunicacao', 
  'transporte', 'alimentacao', 'capacitacao', 'equipamentos', 'outros'
);

-- Project budget lines (planned budget per category)
CREATE TABLE public.project_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category budget_category NOT NULL DEFAULT 'outros',
  description text NOT NULL DEFAULT '',
  planned_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_budget_lines_project ON public.project_budget_lines (project_id);

CREATE TRIGGER update_budget_lines_updated_at
  BEFORE UPDATE ON public.project_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expense entries (actual spending)
CREATE TABLE public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  budget_line_id uuid REFERENCES public.project_budget_lines(id) ON DELETE SET NULL,
  category budget_category NOT NULL DEFAULT 'outros',
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url text,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_project ON public.project_expenses (project_id, category);
CREATE INDEX idx_expenses_date ON public.project_expenses (project_id, expense_date);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for budget lines
ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project budgets"
  ON public.project_budget_lines FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners can view budgets"
  ON public.project_budget_lines FOR SELECT TO authenticated
  USING (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Collaborators can view budgets"
  ON public.project_budget_lines FOR SELECT TO authenticated
  USING (is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Admins can view all budgets"
  ON public.project_budget_lines FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create own budgets"
  ON public.project_budget_lines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.project_budget_lines FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all budgets"
  ON public.project_budget_lines FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete own budgets"
  ON public.project_budget_lines FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all budgets"
  ON public.project_budget_lines FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS for expenses
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON public.project_expenses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners can view expenses"
  ON public.project_expenses FOR SELECT TO authenticated
  USING (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Collaborators can view expenses"
  ON public.project_expenses FOR SELECT TO authenticated
  USING (is_project_collaborator(auth.uid(), project_id));

CREATE POLICY "Admins can view all expenses"
  ON public.project_expenses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create own expenses"
  ON public.project_expenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON public.project_expenses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all expenses"
  ON public.project_expenses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete own expenses"
  ON public.project_expenses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all expenses"
  ON public.project_expenses FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
