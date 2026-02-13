import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectOption {
  id: string;
  name: string;
  organization_name: string;
}

export interface CollaboratorAssignment {
  id: string;
  project_id: string;
  created_at: string;
}

const COLLAB_PROJECTS_KEY = ['collaborator-projects'];
const collabAssignmentsKey = (userId: string) => ['collaborator-assignments', userId];

export const useCollaboratorManagement = (userId?: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: COLLAB_PROJECTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=collaborators', { method: 'GET' });
      if (error) throw error;
      return (data.projects || []) as ProjectOption[];
    },
    enabled: !!userId,
  });

  const assignmentsQuery = useQuery({
    queryKey: collabAssignmentsKey(userId || ''),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(`admin-users?action=collaborators&userId=${userId}`, { method: 'GET' });
      if (error) throw error;
      return (data.collaborators || []) as CollaboratorAssignment[];
    },
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: COLLAB_PROJECTS_KEY });
    if (userId) queryClient.invalidateQueries({ queryKey: collabAssignmentsKey(userId) });
  };

  const assignMutation = useMutation({
    mutationFn: async ({ userId: uId, projectId }: { userId: string; projectId: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=collaborators', {
        method: 'POST',
        body: { userId: uId, projectId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Projeto vinculado ao colaborador!' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao vincular projeto' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ userId: uId, projectId }: { userId: string; projectId: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=collaborators', {
        method: 'DELETE',
        body: { userId: uId, projectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Vínculo removido!' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao remover vínculo' });
    },
  });

  const isMutating = assignMutation.isPending || removeMutation.isPending;

  return {
    projects: projectsQuery.data || [],
    assignments: assignmentsQuery.data || [],
    isLoading: projectsQuery.isLoading || assignmentsQuery.isLoading || isMutating,

    // Backward-compatible
    fetchProjects: () => queryClient.invalidateQueries({ queryKey: COLLAB_PROJECTS_KEY }),
    fetchAssignments: (uId: string) => queryClient.invalidateQueries({ queryKey: collabAssignmentsKey(uId) }),

    assignProject: async (uId: string, projectId: string) => {
      try {
        await assignMutation.mutateAsync({ userId: uId, projectId });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    removeAssignment: async (uId: string, projectId: string) => {
      try {
        await removeMutation.mutateAsync({ userId: uId, projectId });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
  };
};
