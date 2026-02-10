import { useState, useCallback } from 'react';
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

export const useCollaboratorManagement = () => {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignments, setAssignments] = useState<CollaboratorAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users?action=collaborators', {
        method: 'GET'
      });
      if (error) throw error;
      setProjects(data.projects || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  const fetchAssignments = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(`admin-users?action=collaborators&userId=${userId}`, {
        method: 'GET'
      });
      if (error) throw error;
      setAssignments(data.collaborators || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
    }
  }, []);

  const assignProject = async (userId: string, projectId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users?action=collaborators', {
        method: 'POST',
        body: { userId, projectId }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast({ title: 'Sucesso', description: 'Projeto vinculado ao colaborador!' });
      await fetchAssignments(userId);
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao vincular projeto' });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const removeAssignment = async (userId: string, projectId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users?action=collaborators', {
        method: 'DELETE',
        body: { userId, projectId }
      });
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Vínculo removido!' });
      await fetchAssignments(userId);
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao remover vínculo' });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return { projects, assignments, isLoading, fetchProjects, fetchAssignments, assignProject, removeAssignment };
};
