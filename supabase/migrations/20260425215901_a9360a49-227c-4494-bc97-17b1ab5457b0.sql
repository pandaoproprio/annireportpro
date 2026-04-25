ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS cnpj_convenente TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_concedente TEXT,
  ADD COLUMN IF NOT EXISTS valor_global NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS valor_repasse NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS contrapartida NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_cpf TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_cargo TEXT;