-- ===== 1. Campos legais em projects =====
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_cnpj text,
  ADD COLUMN IF NOT EXISTS funder_cnpj text,
  ADD COLUMN IF NOT EXISTS global_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS transfer_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS counterpart_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS legal_responsible_name text,
  ADD COLUMN IF NOT EXISTS legal_responsible_cpf text,
  ADD COLUMN IF NOT EXISTS legal_responsible_role text;

-- ===== 2. Estender budget_adjustments com RA próprio =====
ALTER TABLE public.budget_adjustments
  ADD COLUMN IF NOT EXISTS ra_period_start date,
  ADD COLUMN IF NOT EXISTS ra_period_end date,
  ADD COLUMN IF NOT EXISTS ra_executed_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS ra_status text NOT NULL DEFAULT 'sem_pendencia';

-- valores aceitos: sem_pendencia | pendente_justificativa | justificativa_assinada
ALTER TABLE public.budget_adjustments
  DROP CONSTRAINT IF EXISTS budget_adjustments_ra_status_check;
ALTER TABLE public.budget_adjustments
  ADD CONSTRAINT budget_adjustments_ra_status_check
  CHECK (ra_status IN ('sem_pendencia','pendente_justificativa','justificativa_assinada'));

-- ===== 3. Tipos enum =====
DO $$ BEGIN
  CREATE TYPE public.legal_justification_type AS ENUM (
    'ajuste_pt',
    'prorrogacao_vigencia',
    'execucao_financeira',
    'despesa_nao_prevista',
    'atraso_execucao',
    'substituicao_fornecedor',
    'cancelamento_meta'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.legal_justification_status AS ENUM (
    'rascunho',
    'gerado',
    'aguardando_assinatura',
    'parcialmente_assinado',
    'finalizado',
    'arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 4. Tabela principal de justificativas =====
CREATE TABLE IF NOT EXISTS public.legal_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type public.legal_justification_type NOT NULL,
  status public.legal_justification_status NOT NULL DEFAULT 'rascunho',

  -- Vínculos opcionais
  budget_adjustment_id uuid REFERENCES public.budget_adjustments(id) ON DELETE SET NULL,

  -- Dados de contexto (snapshot na geração — protege contra alteração posterior)
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Parâmetros do passo 2
  reference_period_start date,
  reference_period_end date,
  involved_budget_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  previous_value numeric(14,2),
  new_value numeric(14,2),
  user_reason text NOT NULL DEFAULT '',
  attached_documents jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Conteúdo gerado pela IA / editado
  document_title text NOT NULL DEFAULT '',
  document_body text NOT NULL DEFAULT '',
  legal_basis text NOT NULL DEFAULT '',

  -- Lacre / verificação
  document_hash text,
  hash_generated_at timestamptz,
  qr_verification_code text,
  is_sealed boolean NOT NULL DEFAULT false,
  sealed_at timestamptz,

  -- Storage
  pdf_storage_path text,
  docx_storage_path text,

  -- Metadados
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_legal_just_project ON public.legal_justifications(project_id);
CREATE INDEX IF NOT EXISTS idx_legal_just_status ON public.legal_justifications(status);
CREATE INDEX IF NOT EXISTS idx_legal_just_hash ON public.legal_justifications(document_hash);
CREATE INDEX IF NOT EXISTS idx_legal_just_qr ON public.legal_justifications(qr_verification_code);
CREATE INDEX IF NOT EXISTS idx_legal_just_adjustment ON public.legal_justifications(budget_adjustment_id);

ALTER TABLE public.legal_justifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and collaborators view justifications"
  ON public.legal_justifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_project_owner(auth.uid(), project_id)
    OR is_project_collaborator(auth.uid(), project_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Authors and collaborators insert justifications"
  ON public.legal_justifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      is_project_owner(auth.uid(), project_id)
      OR is_project_collaborator(auth.uid(), project_id)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Authors update unsealed justifications"
  ON public.legal_justifications FOR UPDATE TO authenticated
  USING (
    is_sealed = false AND (
      user_id = auth.uid()
      OR is_project_owner(auth.uid(), project_id)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Admin delete justifications"
  ON public.legal_justifications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Política pública de verificação por hash (somente leitura mínima via verify endpoint — feito via edge function)
-- Nada a fazer em RLS; verificação será via edge function service_role.

CREATE TRIGGER update_legal_justifications_updated_at
  BEFORE UPDATE ON public.legal_justifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 5. Versionamento =====
CREATE TABLE IF NOT EXISTS public.legal_justification_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  justification_id uuid NOT NULL REFERENCES public.legal_justifications(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  document_body text NOT NULL,
  legal_basis text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  change_note text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual', -- 'ia' | 'manual' | 'regenerate'
  UNIQUE (justification_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_legal_just_versions ON public.legal_justification_versions(justification_id, version_number DESC);

ALTER TABLE public.legal_justification_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View versions if can view justification"
  ON public.legal_justification_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.legal_justifications lj
    WHERE lj.id = justification_id
      AND (
        lj.user_id = auth.uid()
        OR is_project_owner(auth.uid(), lj.project_id)
        OR is_project_collaborator(auth.uid(), lj.project_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  ));

CREATE POLICY "Insert versions if can edit justification"
  ON public.legal_justification_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.legal_justifications lj
    WHERE lj.id = justification_id
      AND lj.is_sealed = false
      AND (
        lj.user_id = auth.uid()
        OR is_project_owner(auth.uid(), lj.project_id)
        OR is_project_collaborator(auth.uid(), lj.project_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  ));

-- ===== 6. Assinaturas =====
CREATE TABLE IF NOT EXISTS public.legal_justification_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  justification_id uuid NOT NULL REFERENCES public.legal_justifications(id) ON DELETE CASCADE,
  signer_type text NOT NULL, -- 'responsavel_legal' | 'fornecedor'
  signer_user_id uuid,        -- quando interno
  signer_name text NOT NULL,
  signer_cpf_cnpj text NOT NULL,
  signer_role text NOT NULL DEFAULT '',
  signer_email text,
  signature_token text UNIQUE, -- para assinatura externa por link
  signed boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  signed_ip text,
  signature_method text NOT NULL DEFAULT 'eletronica_simples', -- 'eletronica_simples' | 'gov_br_offline'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_sig_just ON public.legal_justification_signatures(justification_id);
CREATE INDEX IF NOT EXISTS idx_legal_sig_token ON public.legal_justification_signatures(signature_token);

ALTER TABLE public.legal_justification_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View signatures if can view justification"
  ON public.legal_justification_signatures FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.legal_justifications lj
    WHERE lj.id = justification_id
      AND (
        lj.user_id = auth.uid()
        OR is_project_owner(auth.uid(), lj.project_id)
        OR is_project_collaborator(auth.uid(), lj.project_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  ));

CREATE POLICY "Manage signatures if can edit justification"
  ON public.legal_justification_signatures FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.legal_justifications lj
    WHERE lj.id = justification_id
      AND (
        lj.user_id = auth.uid()
        OR is_project_owner(auth.uid(), lj.project_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.legal_justifications lj
    WHERE lj.id = justification_id
      AND (
        lj.user_id = auth.uid()
        OR is_project_owner(auth.uid(), lj.project_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  ));

-- ===== 7. Storage bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-justifications', 'legal-justifications', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read legal justifications"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legal-justifications');

CREATE POLICY "Authenticated upload legal justifications"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal-justifications');

CREATE POLICY "Authenticated update legal justifications"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'legal-justifications');

-- ===== 8. Permissão nova =====
DO $$ BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'legal_justifications';
EXCEPTION WHEN others THEN NULL; END $$;