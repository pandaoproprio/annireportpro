import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface MemberProjectAssignment {
  team_member_id: string;
  project_id: string;
  project_name: string;
}

const MEMBERS_KEY = ['team-members'];
const ASSIGNMENTS_KEY = ['team-member-assignments'];
const projectMembersKey = (projectId: string) => ['project-team-members', projectId];

export const useTeamMembers = (projectId?: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Queries ──

  const membersQuery = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });

  const projectMembersQuery = useQuery({
    queryKey: projectMembersKey(projectId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return (data || []) as ProjectTeamMember[];
    },
    enabled: !!projectId,
  });

  const allAssignmentsQuery = useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team_members')
        .select('team_member_id, project_id, projects(name)');
      if (error) throw error;
      return (data || []).map((d: any) => ({
        team_member_id: d.team_member_id,
        project_id: d.project_id,
        project_name: d.projects?.name || 'Projeto',
      })) as MemberProjectAssignment[];
    },
  });

  // ── Helpers ──

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
    if (projectId) queryClient.invalidateQueries({ queryKey: projectMembersKey(projectId) });
  };

  // ── Mutations ──

  const createMemberMutation = useMutation({
    mutationFn: async (member: { name: string; document?: string; function_role: string; email?: string; phone?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('team_members')
        .insert({ ...member, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Membro adicionado!' });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TeamMember> }) => {
      const { error } = await supabase.from('team_members').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Membro atualizado!' });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Membro removido!' });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  const assignToProjectMutation = useMutation({
    mutationFn: async ({ teamMemberId, projectId: pId }: { teamMemberId: string; projectId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('project_team_members')
        .insert({ team_member_id: teamMemberId, project_id: pId, added_by: user.id });
      if (error) {
        if (error.code === '23505') throw new Error('Membro já vinculado a este projeto');
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Membro vinculado ao projeto!' });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  const removeFromProjectMutation = useMutation({
    mutationFn: async ({ teamMemberId, projectId: pId }: { teamMemberId: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('team_member_id', teamMemberId)
        .eq('project_id', pId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Vínculo removido!' });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  const linkUserAccountMutation = useMutation({
    mutationFn: async ({ teamMemberId, userId }: { teamMemberId: string; userId: string }) => {
      const { error } = await supabase.from('team_members').update({ user_id: userId }).eq('id', teamMemberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Conta vinculada ao membro!' });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  const createAccessForMemberMutation = useMutation({
    mutationFn: async ({ member, password }: { member: TeamMember; password: string }) => {
      if (!member.email) throw new Error('Membro precisa ter um e-mail cadastrado');
      if (password.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Determine role based on function_role
      const functionLower = member.function_role.toLowerCase();
      let memberRole = 'usuario';
      if (functionLower.includes('coordenador')) {
        memberRole = 'coordenador';
      } else if (functionLower.includes('oficineiro')) {
        memberRole = 'oficineiro';
      }

      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'POST',
        body: { email: member.email, password, name: member.name, role: memberRole },
      });
      if (error) {
        // Parse edge function error for better messaging
        const errBody = typeof error === 'object' && 'context' in (error as any)
          ? (error as any).context?.body
          : null;
        if (errBody && typeof errBody === 'string' && errBody.includes('já está cadastrado')) {
          throw new Error('Este e-mail já está cadastrado no sistema. Use a opção de vincular conta existente.');
        }
        throw error;
      }
      if (data?.error) {
        if (data.error.includes('já está cadastrado')) {
          throw new Error('Este e-mail já está cadastrado no sistema. Use a opção de vincular conta existente.');
        }
        throw new Error(data.error);
      }

      const newUserId = data?.user?.id;
      if (!newUserId) throw new Error('Erro ao criar conta');

      await supabase.from('team_members').update({ user_id: newUserId }).eq('id', member.id);

      const { data: assignments } = await supabase
        .from('project_team_members')
        .select('project_id')
        .eq('team_member_id', member.id);

      if (assignments && assignments.length > 0) {
        for (const a of assignments) {
          await supabase.functions.invoke('admin-users?action=collaborators', {
            method: 'POST',
            body: { userId: newUserId, projectId: a.project_id },
          });
        }
      }

      return member;
    },
    onSuccess: (member) => {
      toast({ title: 'Acesso criado!', description: `Login: ${member.email} — Senha temporária definida.` });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao criar acesso', description: error.message });
    },
  });

  // ── Backward-compatible API ──

  const isLoading = membersQuery.isLoading || projectMembersQuery.isLoading;
  const isMutating =
    createMemberMutation.isPending || updateMemberMutation.isPending ||
    deleteMemberMutation.isPending || assignToProjectMutation.isPending ||
    removeFromProjectMutation.isPending || createAccessForMemberMutation.isPending;

  return {
    members: membersQuery.data || [],
    projectMembers: projectMembersQuery.data || [],
    allAssignments: allAssignmentsQuery.data || [],
    isLoading: isLoading || isMutating,

    // Keep fetch* for backward compat — they just refetch the queries
    fetchMembers: () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
    fetchProjectMembers: (pId: string) => queryClient.invalidateQueries({ queryKey: projectMembersKey(pId) }),
    fetchAllAssignments: () => queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY }),

    // Mutations with same signatures
    createMember: async (member: { name: string; document?: string; function_role: string; email?: string; phone?: string }) => {
      try {
        const data = await createMemberMutation.mutateAsync(member);
        return { success: true, data };
      } catch {
        return { success: false };
      }
    },
    updateMember: async (id: string, updates: Partial<TeamMember>) => {
      try {
        await updateMemberMutation.mutateAsync({ id, updates });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    deleteMember: async (id: string) => {
      try {
        await deleteMemberMutation.mutateAsync(id);
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    assignToProject: async (teamMemberId: string, projectId: string) => {
      try {
        await assignToProjectMutation.mutateAsync({ teamMemberId, projectId });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    removeFromProject: async (teamMemberId: string, projectId: string) => {
      try {
        await removeFromProjectMutation.mutateAsync({ teamMemberId, projectId });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    linkUserAccount: async (teamMemberId: string, userId: string) => {
      try {
        await linkUserAccountMutation.mutateAsync({ teamMemberId, userId });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    createAccessForMember: async (member: TeamMember, password: string) => {
      try {
        await createAccessForMemberMutation.mutateAsync({ member, password });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
  };
};
