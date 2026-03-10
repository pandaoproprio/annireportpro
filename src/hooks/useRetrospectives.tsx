import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Retrospective {
  id: string;
  project_id: string;
  sprint_id: string | null;
  user_id: string;
  type: string;
  went_well: string;
  to_improve: string;
  action_items: { text: string; done: boolean }[];
  created_at: string;
  updated_at: string;
}

export function useRetrospectives(projectId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['retrospectives', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retrospectives' as any)
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Retrospective[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (form: { went_well: string; to_improve: string; action_items: { text: string; done: boolean }[]; sprint_id?: string }) => {
      const { error } = await supabase.from('retrospectives' as any).insert({
        project_id: projectId,
        user_id: user!.id,
        went_well: form.went_well,
        to_improve: form.to_improve,
        action_items: form.action_items,
        sprint_id: form.sprint_id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retrospectives', projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('retrospectives' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retrospectives', projectId] }),
  });

  return { retrospectives: query.data || [], isLoading: query.isLoading, create, remove };
}
