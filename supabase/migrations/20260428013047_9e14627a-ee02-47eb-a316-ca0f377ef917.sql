-- ============================================================
-- 1) Configuração jurídica/institucional (desativada por padrão)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_legal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  razao_social TEXT,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  email_administrativo TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_legal_settings ENABLE ROW LEVEL SECURITY;

-- Linha-semente única (sempre haverá apenas 1 linha de configuração)
INSERT INTO public.organization_legal_settings (is_active)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.organization_legal_settings);

-- Leitura pública (somente leitura) — necessária para o termo público renderizar os dados
CREATE POLICY "Org legal settings public read"
ON public.organization_legal_settings FOR SELECT
USING (true);

-- Edição apenas para admins/super_admins
CREATE POLICY "Org legal settings admin update"
ON public.organization_legal_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_org_legal_settings_updated_at
BEFORE UPDATE ON public.organization_legal_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) Termos de voluntariado assinados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voluntario_termos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_response_id UUID REFERENCES public.form_responses(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL,

  -- Identificação do voluntário (snapshot)
  voluntario_nome TEXT NOT NULL,
  voluntario_cpf TEXT,
  voluntario_email TEXT,
  voluntario_cidade_estado TEXT,

  -- Snapshot da entidade no momento da assinatura
  entidade_razao_social TEXT,
  entidade_cnpj TEXT,
  entidade_endereco TEXT,
  entidade_cidade TEXT,

  -- Documento e assinatura
  pdf_url TEXT,
  pdf_path TEXT,
  hash_sha256 TEXT NOT NULL,
  metodo_assinatura TEXT NOT NULL CHECK (metodo_assinatura IN ('canvas','digitado')),
  assinatura_imagem_base64 TEXT,
  assinatura_texto TEXT,

  -- Auditoria
  ip_address TEXT,
  user_agent TEXT,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Status
  status TEXT NOT NULL DEFAULT 'assinado' CHECK (status IN ('assinado','revogado')),
  revogado_em TIMESTAMPTZ,
  revogado_motivo TEXT,
  revogado_por UUID,

  -- Token público para o voluntário acessar/baixar depois
  public_token UUID NOT NULL DEFAULT gen_random_uuid(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voluntario_termos_response ON public.voluntario_termos(form_response_id);
CREATE INDEX IF NOT EXISTS idx_voluntario_termos_form ON public.voluntario_termos(form_id);
CREATE INDEX IF NOT EXISTS idx_voluntario_termos_status ON public.voluntario_termos(status);

ALTER TABLE public.voluntario_termos ENABLE ROW LEVEL SECURITY;

-- INSERT público: o formulário público precisa criar o termo no momento da assinatura
CREATE POLICY "Public can insert volunteer terms"
ON public.voluntario_termos FOR INSERT
WITH CHECK (true);

-- SELECT público pelo public_token (o voluntário baixa pelo link)
CREATE POLICY "Public select volunteer term by token"
ON public.voluntario_termos FOR SELECT
USING (true);

-- UPDATE apenas para admin/analista (revogação, atualização de pdf_url)
CREATE POLICY "Admins can update volunteer terms"
ON public.voluntario_termos FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'analista'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'analista'::app_role)
);

CREATE TRIGGER trg_voluntario_termos_updated_at
BEFORE UPDATE ON public.voluntario_termos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) Storage bucket privado para os PDFs
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('voluntario-termos', 'voluntario-termos', false)
ON CONFLICT (id) DO NOTHING;

-- INSERT público no bucket (upload do PDF gerado no momento da assinatura).
-- O nome do arquivo deve seguir o padrão {responseId}/{termoId}.pdf controlado pelo frontend.
CREATE POLICY "Public can upload volunteer term PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voluntario-termos');

-- SELECT (download) público — os PDFs serão acessados via signed URL gerada pelo backend
CREATE POLICY "Public can read volunteer term PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'voluntario-termos');

-- Admin/analista pode atualizar/deletar (caso necessário)
CREATE POLICY "Admins can manage volunteer term PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voluntario-termos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'analista'::app_role)
  )
);

CREATE POLICY "Admins can delete volunteer term PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voluntario-termos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);