import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentModel } from '@/types/document';

export interface VersionEntry {
  id: string;
  version_number: number;
  content_snapshot: DocumentModel;
  created_at: string;
}

export const useVersionHistory = (documentId?: string) => {
  const queryClient = useQueryClient();
  const [comparingVersions, setComparingVersions] = useState<[VersionEntry, VersionEntry] | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        version_number: r.version_number,
        content_snapshot: r.content_snapshot as unknown as DocumentModel,
        created_at: r.created_at,
      })) as VersionEntry[];
    },
    enabled: !!documentId,
  });

  const saveSnapshotMutation = useMutation({
    mutationFn: async (model: DocumentModel) => {
      if (!documentId) throw new Error('No document id');
      const nextVersion = (versions[0]?.version_number ?? 0) + 1;
      const { error } = await supabase.from('document_versions').insert({
        document_id: documentId,
        version_number: nextVersion,
        content_snapshot: JSON.parse(JSON.stringify(model)),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Snapshot salvo com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar snapshot'),
  });

  const saveSnapshot = useCallback(
    (model: DocumentModel) => saveSnapshotMutation.mutate(model),
    [saveSnapshotMutation]
  );

  const startCompare = useCallback((a: VersionEntry, b: VersionEntry) => {
    const sorted = a.version_number < b.version_number ? [a, b] as [VersionEntry, VersionEntry] : [b, a] as [VersionEntry, VersionEntry];
    setComparingVersions(sorted);
  }, []);

  const stopCompare = useCallback(() => setComparingVersions(null), []);

  return {
    versions,
    isLoading,
    isSaving: saveSnapshotMutation.isPending,
    saveSnapshot,
    comparingVersions,
    startCompare,
    stopCompare,
  };
};
