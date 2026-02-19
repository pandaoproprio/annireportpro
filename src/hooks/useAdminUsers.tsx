import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AdminRole = 'usuario' | 'analista' | 'admin' | 'super_admin';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
  createdAt: string;
  lastSignIn: string | null;
  emailConfirmed: boolean;
}

const ADMIN_USERS_KEY = ['admin-users'];

export const useAdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', { method: 'GET' });
      if (error) throw error;
      return (data.users || []) as AdminUser[];
    },
    enabled: false, // only fetch when explicitly enabled (super_admin check in consumer)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });

  const fetchUsers = React.useCallback(() => usersQuery.refetch(), []);

  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; password?: string; name: string; role: AdminRole; sendInvite?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { method: 'POST', body: userData });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'Sucesso', description: vars.sendInvite ? 'Convite enviado com sucesso!' : 'Usuário criado com sucesso!' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao criar usuário' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string; name?: string; role?: AdminRole; password?: string; permissions?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { method: 'PATCH', body: { userId, ...updates } });
      if (error) throw error;
      return { data, updates };
    },
    onSuccess: (result) => {
      toast({ title: 'Sucesso', description: result.updates.password ? 'Senha redefinida com sucesso!' : 'Usuário atualizado com sucesso!' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao atualizar usuário' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { method: 'DELETE', body: { userId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Usuário removido com sucesso!' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao remover usuário' });
    },
  });

  const isMutating = createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending;

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading || usersQuery.isFetching || isMutating,

    fetchUsers,

    createUser: async (userData: { email: string; password?: string; name: string; role: AdminRole; sendInvite?: boolean }) => {
      try {
        await createUserMutation.mutateAsync(userData);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    updateUser: async (userId: string, updates: { name?: string; role?: AdminRole; password?: string; permissions?: string[] }) => {
      try {
        await updateUserMutation.mutateAsync({ userId, ...updates });
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    deleteUser: async (userId: string) => {
      try {
        await deleteUserMutation.mutateAsync(userId);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
  };
};
