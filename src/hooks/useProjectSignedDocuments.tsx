import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SignedDocCategory =
  | 'termo_fomento'
  | 'plano_trabalho'
  | 'contrato_rh'
  | 'contrato_servico'
  | 'contrato_fornecedor'
  | 'declaracao_justificativa'
  | 'aditivo'
  | 'outro';

export interface SignedDocument {
  id: string;
  project_id: string;
  category: SignedDocCategory;
  display_name: string;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number;
  sha256_hash: string;
  signature_provider: string | null;
  signed_at: string | null;
  signers: any[];
  legal_justification_id: string | null;
  notes: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<SignedDocCategory, string> = {
  termo_fomento: 'Termo de Fomento',
  plano_trabalho: 'Plano de Trabalho',
  contrato_rh: 'Contrato RH',
  contrato_servico: 'Contrato de Serviço',
  contrato_fornecedor: 'Contrato de Fornecedor',
  declaracao_justificativa: 'Declaração de Justificativa',
  aditivo: 'Aditivo',
  outro: 'Outro',
};

export function useProjectSignedDocuments(projectId: string | undefined) {
  const [documents, setDocuments] = useState<SignedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await (supabase as any)
      .from('project_signed_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDocuments((data ?? []) as SignedDocument[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = useCallback(
    async (file: File, opts: { category?: SignedDocCategory; displayName?: string; notes?: string } = {}) => {
      if (!projectId) throw new Error('projectId é obrigatório');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Você precisa estar autenticado');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('project_id', projectId);
      if (opts.category) fd.append('category', opts.category);
      if (opts.displayName) fd.append('display_name', opts.displayName);
      if (opts.notes) fd.append('notes', opts.notes);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-signed-document`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? 'upload_failed');
      return json as { status: 'ok' | 'duplicate'; document?: SignedDocument; id?: string; display_name?: string };
    },
    [projectId]
  );

  const downloadDocument = useCallback(async (doc: SignedDocument) => {
    const { data, error } = await supabase.storage
      .from('project-signed-docs')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) throw new Error(error?.message ?? 'signed_url_failed');
    window.open(data.signedUrl, '_blank');
  }, []);

  return { documents, loading, error, refresh: fetchDocuments, uploadDocument, downloadDocument };
}
