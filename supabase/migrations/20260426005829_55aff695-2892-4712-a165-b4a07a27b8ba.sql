
-- 1) Bucket privado para os PDFs assinados externamente
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-signed-docs', 'project-signed-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Categorias dos documentos assinados
DO $$ BEGIN
  CREATE TYPE public.signed_document_category AS ENUM (
    'termo_fomento',
    'plano_trabalho',
    'contrato_rh',
    'contrato_servico',
    'contrato_fornecedor',
    'declaracao_justificativa',
    'aditivo',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tabela de documentos assinados (imutável após criação)
CREATE TABLE IF NOT EXISTS public.project_signed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  category public.signed_document_category NOT NULL DEFAULT 'outro',
  display_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256_hash TEXT NOT NULL,
  signature_provider TEXT,
  signed_at TIMESTAMPTZ,
  signers JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_justification_id UUID REFERENCES public.legal_justifications(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psd_project ON public.project_signed_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_psd_category ON public.project_signed_documents(category);
CREATE UNIQUE INDEX IF NOT EXISTS uq_psd_project_hash ON public.project_signed_documents(project_id, sha256_hash);

ALTER TABLE public.project_signed_documents ENABLE ROW LEVEL SECURITY;

-- Visualização: dono do projeto, colaborador, membro de equipe ou admins
CREATE POLICY "View signed docs of accessible projects"
ON public.project_signed_documents FOR SELECT
USING (
  public.is_project_owner(auth.uid(), project_id)
  OR public.is_project_collaborator(auth.uid(), project_id)
  OR public.is_project_team_member_user(auth.uid(), project_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Inserção: dono, colaborador ou admins
CREATE POLICY "Insert signed docs on accessible projects"
ON public.project_signed_documents FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND (
    public.is_project_owner(auth.uid(), project_id)
    OR public.is_project_collaborator(auth.uid(), project_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Atualização SOMENTE de notes/category (imutabilidade do conteúdo é garantida na app)
CREATE POLICY "Update signed docs (metadata only)"
ON public.project_signed_documents FOR UPDATE
USING (
  public.is_project_owner(auth.uid(), project_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Exclusão: apenas admins
CREATE POLICY "Delete signed docs (admin only)"
ON public.project_signed_documents FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE TRIGGER trg_psd_updated_at
BEFORE UPDATE ON public.project_signed_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Storage policies para o bucket privado
CREATE POLICY "Read signed docs from accessible projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-signed-docs'
  AND EXISTS (
    SELECT 1 FROM public.project_signed_documents psd
    WHERE psd.storage_path = name
      AND (
        public.is_project_owner(auth.uid(), psd.project_id)
        OR public.is_project_collaborator(auth.uid(), psd.project_id)
        OR public.is_project_team_member_user(auth.uid(), psd.project_id)
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

CREATE POLICY "Upload signed docs to project folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-signed-docs'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Delete signed docs (admin only) from storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-signed-docs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 5) Permitir 'imported_signed' como status em legal_justifications
DO $$ BEGIN
  ALTER TYPE public.legal_justification_status ADD VALUE IF NOT EXISTS 'imported_signed';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
