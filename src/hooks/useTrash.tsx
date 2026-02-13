import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { logAuditEvent } from '@/lib/auditLog';

export interface TrashedItem {
  id: string;
  name: string;
  type: 'project' | 'activity' | 'team_report';
  deletedAt: string;
  meta?: string;
}

export const useTrash = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const trashedQuery = useQuery({
    queryKey: ['trashed-items'],
    queryFn: async (): Promise<TrashedItem[]> => {
      if (!user) return [];

      const [projectsRes, activitiesRes, reportsRes] = await Promise.all([
        supabase.from('projects').select('id, name, deleted_at').not('deleted_at', 'is', null).eq('user_id', user.id),
        supabase.from('activities').select('id, description, deleted_at, date').not('deleted_at', 'is', null).eq('user_id', user.id),
        supabase.from('team_reports').select('id, provider_name, deleted_at, period_start, period_end').not('deleted_at', 'is', null).eq('user_id', user.id),
      ]);

      const items: TrashedItem[] = [];

      (projectsRes.data || []).forEach(p => items.push({
        id: p.id, name: p.name, type: 'project', deletedAt: p.deleted_at!,
      }));

      (activitiesRes.data || []).forEach(a => items.push({
        id: a.id, name: a.description?.substring(0, 60) || 'Atividade', type: 'activity', deletedAt: a.deleted_at!, meta: a.date,
      }));

      (reportsRes.data || []).forEach(r => items.push({
        id: r.id, name: r.provider_name, type: 'team_report', deletedAt: r.deleted_at!,
        meta: `${r.period_start} — ${r.period_end}`,
      }));

      return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    },
    enabled: !!user,
  });

  const restoreMutation = useMutation({
    mutationFn: async (item: TrashedItem) => {
      const table = item.type === 'project' ? 'projects' : item.type === 'activity' ? 'activities' : 'team_reports';
      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      toast({ title: 'Restaurado', description: `"${item.name}" foi restaurado com sucesso.` });
      if (user) {
        logAuditEvent({
          userId: user.id,
          action: 'UPDATE',
          entityType: item.type,
          entityId: item.id,
          entityName: item.name,
          metadata: { action: 'restore' },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['trashed-items'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['team-reports'] });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  return {
    items: trashedQuery.data || [],
    isLoading: trashedQuery.isLoading,
    restore: (item: TrashedItem) => restoreMutation.mutateAsync(item),
    isRestoring: restoreMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['trashed-items'] }),
  };
};
