import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type LegalJustificationType =
  | 'ajuste_pt'
  | 'prorrogacao_vigencia'
  | 'execucao_financeira'
  | 'despesa_nao_prevista'
  | 'atraso_execucao'
  | 'substituicao_fornecedor'
  | 'cancelamento_meta';

export type LegalJustificationStatus =
  | 'rascunho'
  | 'gerado'
  | 'aguardando_assinatura'
  | 'parcialmente_assinado'
  | 'finalizado'
  | 'arquivado';

export interface LegalJustification {
  id: string;
  project_id: string;
  user_id: string;
  type: LegalJustificationType;
  status: LegalJustificationStatus;
  budget_adjustment_id: string | null;
  context_snapshot: Record<string, unknown>;
  reference_period_start: string | null;
  reference_period_end: string | null;
  involved_budget_lines: string[];
  previous_value: number | null;
  new_value: number | null;
  user_reason: string;
  attached_documents: Array<{ name: string; url: string }>;
  document_title: string;
  document_body: string;
  legal_basis: string;
  document_hash: string | null;
  qr_verification_code: string | null;
  is_sealed: boolean;
  sealed_at: string | null;
  pdf_storage_path: string | null;
  docx_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface JustificationSignature {
  id: string;
  justification_id: string;
  signer_type: 'responsavel_legal' | 'fornecedor';
  signer_user_id: string | null;
  signer_name: string;
  signer_cpf_cnpj: string;
  signer_role: string;
  signer_email: string | null;
  signature_token: string | null;
  signed: boolean;
  signed_at: string | null;
  signature_method: string;
  created_at: string;
}

export const TYPE_LABELS: Record<LegalJustificationType, string> = {
  ajuste_pt: 'Ajuste de Plano de Trabalho',
  prorrogacao_vigencia: 'Prorrogação de Vigência',
  execucao_financeira: 'Execução Financeira',
  despesa_nao_prevista: 'Despesa Não Prevista',
  atraso_execucao: 'Atraso de Execução',
  substituicao_fornecedor: 'Substituição de Fornecedor',
  cancelamento_meta: 'Cancelamento de Meta',
};

export const STATUS_LABELS: Record<LegalJustificationStatus, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  gerado: { label: 'Gerado', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  aguardando_assinatura: { label: 'Aguardando Assinatura', color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300' },
  parcialmente_assinado: { label: 'Parcialmente Assinado', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  finalizado: { label: 'Finalizado', color: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  arquivado: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
};

export const useLegalJustifications = (projectId?: string) => {
  const { user } = useAuth();
  const [items, setItems] = useState<LegalJustification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let q = supabase.from('legal_justifications' as any)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data as any) || []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar justificativas');
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (payload: Partial<LegalJustification>) => {
    if (!user) throw new Error('Não autenticado');
    const { data, error } = await supabase.from('legal_justifications' as any).insert({
      ...payload,
      user_id: user.id,
    } as any).select().single();
    if (error) throw error;
    await fetchAll();
    return data as any as LegalJustification;
  };

  const update = async (id: string, patch: Partial<LegalJustification>) => {
    const { error } = await supabase.from('legal_justifications' as any).update(patch as any).eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('legal_justifications' as any).update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
    if (error) throw error;
    await fetchAll();
  };

  const generateAI = async (params: {
    type: LegalJustificationType;
    project: any;
    context?: any;
    parameters: any;
  }) => {
    const { data, error } = await supabase.functions.invoke('legal-justification-ai', {
      body: params,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { title: string; legal_basis: string; body: string };
  };

  const saveVersion = async (justificationId: string, body: string, legalBasis: string, source: 'ia' | 'manual' | 'regenerate', changeNote = '') => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('legal_justification_versions' as any)
      .select('version_number')
      .eq('justification_id', justificationId)
      .order('version_number', { ascending: false })
      .limit(1);
    const nextVersion = ((existing as any)?.[0]?.version_number || 0) + 1;
    await supabase.from('legal_justification_versions' as any).insert({
      justification_id: justificationId,
      version_number: nextVersion,
      document_body: body,
      legal_basis: legalBasis,
      created_by: user.id,
      source,
      change_note: changeNote,
    } as any);
  };

  const seal = async (justificationId: string) => {
    const { data, error } = await supabase.functions.invoke('legal-justification-seal', {
      body: { justification_id: justificationId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchAll();
    return data;
  };

  return { items, loading, fetchAll, create, update, remove, generateAI, saveVersion, seal };
};
