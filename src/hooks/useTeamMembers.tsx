import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  id: string;
  name: string;
  document: string | null;
  function_role: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  team_member_id: string;
  created_at: string;
}

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');
      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar membros da equipe' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchProjectMembers = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      setProjectMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching project team members:', error);
    }
  }, []);

  const createMember = async (member: { name: string; document?: string; function_role: string; email?: string; phone?: string }) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('team_members')
        .insert({ ...member, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Membro adicionado!' });
      await fetchMembers();
      return { success: true, data };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const updateMember = async (id: string, updates: Partial<TeamMember>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Membro atualizado!' });
      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMember = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Membro removido!' });
      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const assignToProject = async (teamMemberId: string, projectId: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('project_team_members')
        .insert({ team_member_id: teamMemberId, project_id: projectId, added_by: user.id });
      if (error) {
        if (error.code === '23505') throw new Error('Membro já vinculado a este projeto');
        throw error;
      }
      
      toast({ title: 'Sucesso', description: 'Membro vinculado ao projeto!' });
      await fetchProjectMembers(projectId);
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromProject = async (teamMemberId: string, projectId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('team_member_id', teamMemberId)
        .eq('project_id', projectId);
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Vínculo removido!' });
      await fetchProjectMembers(projectId);
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const linkUserAccount = async (teamMemberId: string, userId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ user_id: userId })
        .eq('id', teamMemberId);
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Conta vinculada ao membro!' });
      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    members, projectMembers, isLoading,
    fetchMembers, fetchProjectMembers,
    createMember, updateMember, deleteMember,
    assignToProject, removeFromProject, linkUserAccount
  };
};
