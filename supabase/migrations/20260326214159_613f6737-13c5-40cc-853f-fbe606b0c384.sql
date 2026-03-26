
-- Budget Adjustment (Ajuste de PT/RA) master record
CREATE TABLE public.budget_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Ajuste de PT',
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_analise', 'aprovado', 'devolvido')),
  ra_balance NUMERIC NOT NULL DEFAULT 0,
  ra_justification TEXT NOT NULL DEFAULT '',
  ra_schedule TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budget Adjustment Items (each line item from the original PT)
CREATE TABLE public.budget_adjustment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES public.budget_adjustments(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL DEFAULT '',
  specification TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  original_unit_value NUMERIC NOT NULL DEFAULT 0,
  original_unit_measure TEXT NOT NULL DEFAULT '',
  original_quantity NUMERIC NOT NULL DEFAULT 0,
  original_total NUMERIC NOT NULL DEFAULT 0,
  executed_amount NUMERIC NOT NULL DEFAULT 0,
  proposal TEXT NOT NULL DEFAULT 'manter' CHECK (proposal IN ('manter', 'alterar', 'excluir')),
  new_specification TEXT NOT NULL DEFAULT '',
  new_unit_value NUMERIC NOT NULL DEFAULT 0,
  new_unit_measure TEXT NOT NULL DEFAULT '',
  new_quantity NUMERIC NOT NULL DEFAULT 0,
  new_total NUMERIC NOT NULL DEFAULT 0,
  justification TEXT NOT NULL DEFAULT '',
  price_ref_1 TEXT NOT NULL DEFAULT '',
  price_ref_1_value NUMERIC NOT NULL DEFAULT 0,
  price_ref_2 TEXT NOT NULL DEFAULT '',
  price_ref_2_value NUMERIC NOT NULL DEFAULT 0,
  price_ref_3 TEXT NOT NULL DEFAULT '',
  price_ref_3_value NUMERIC NOT NULL DEFAULT 0,
  price_average NUMERIC NOT NULL DEFAULT 0,
  meta_group TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_new_item BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.budget_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_adjustment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own project adjustments" ON public.budget_adjustments
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_project_owner(auth.uid(), project_id)
    OR public.is_project_collaborator(auth.uid(), project_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_project_owner(auth.uid(), project_id)
    OR public.is_project_collaborator(auth.uid(), project_id)
  );

CREATE POLICY "Users can manage adjustment items via parent" ON public.budget_adjustment_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_adjustments ba
      WHERE ba.id = adjustment_id
      AND (ba.user_id = auth.uid()
        OR public.is_project_owner(auth.uid(), ba.project_id)
        OR public.is_project_collaborator(auth.uid(), ba.project_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_adjustments ba
      WHERE ba.id = adjustment_id
      AND (ba.user_id = auth.uid()
        OR public.is_project_owner(auth.uid(), ba.project_id)
        OR public.is_project_collaborator(auth.uid(), ba.project_id))
    )
  );
