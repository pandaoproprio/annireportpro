import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AdminRole = 'usuario' | 'oficineiro' | 'voluntario' | 'coordenador' | 'analista' | 'admin' | 'super_admin';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
  createdAt: string;
  lastSignIn: string | null;
  emailConfirmed: boolean;
  mfaEnabled: boolean;
  mustChangePassword?: boolean;
  cargo?: string | null;
  areaSetor?: string | null;
  tempPassword?: string | null;
  tempPasswordSetAt?: string | null;
  firstLoginAt?: string | null;
  activeResetLinkSentAt?: string | null;
  activeResetLinkExpiresAt?: string | null;
  activeResetLinkEmailSent?: boolean;
}

export interface ResetLinkResult {
  userId: string;
  email: string;
  resetUrl?: string;
  emailSent?: boolean;
  error?: string;
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
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (result, vars) => {
      const isAutoProvisioned = result?.autoProvisioned;
      const desc = isAutoProvisioned
        ? `Acesso criado! Login: ${vars.email} — Senha temporária gerada e enviada por e-mail.`
        : vars.sendInvite
          ? 'Convite enviado com sucesso!'
          : `Acesso criado! Login: ${vars.email} — Senha temporária definida.`;
      toast({ title: 'Sucesso', description: desc });
      invalidate();
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao criar usuário' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string; name?: string; email?: string; role?: AdminRole; password?: string; permissions?: string[]; cargo?: string | null; area_setor?: string | null }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { method: 'PATCH', body: { userId, ...updates } });
      if (error) {
        let friendly = error.message || 'Erro ao atualizar usuário';
        try {
          const ctx: any = (error as any).context;
          if (ctx?.json) {
            const body = await ctx.json();
            if (body?.error) friendly = body.error;
          } else if (ctx?.text) {
            const txt = await ctx.text();
            try { const body = JSON.parse(txt); if (body?.error) friendly = body.error; } catch {}
          }
        } catch {}
        throw new Error(friendly);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
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

  const disableMfaMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=disable-mfa', { method: 'POST', body: { userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'MFA desabilitado com sucesso!' });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Erro ao desabilitar MFA' });
    },
  });

  // ===== Restored password management actions =====
  const setTempPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=set-temp-password', {
        method: 'POST',
        body: { userId, password },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Senha temporária definida', description: 'O usuário deverá trocar a senha no próximo acesso.' });
      invalidate();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const forceChangeMutation = useMutation({
    mutationFn: async (params: { userId?: string; userIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=force-change', {
        method: 'POST',
        body: params,
      });
      if (error) throw new Error((data as any)?.error || error.message);
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: 'Troca solicitada', description: `${data?.count || 1} usuário(s) precisarão trocar a senha no próximo acesso.` });
      invalidate();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const generateResetLinkMutation = useMutation({
    mutationFn: async (params: { userId?: string; userIds?: string[]; sendEmail: boolean; redirectTo?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-users?action=generate-reset-link', {
        method: 'POST',
        body: params,
      });
      if (error) throw new Error((data as any)?.error || error.message);
      return data as { success: boolean; results: ResetLinkResult[] };
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const isMutating = createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending || disableMfaMutation.isPending || setTempPasswordMutation.isPending || forceChangeMutation.isPending || generateResetLinkMutation.isPending;

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
    updateUser: async (userId: string, updates: { name?: string; role?: AdminRole; password?: string; permissions?: string[]; email?: string; cargo?: string | null; area_setor?: string | null }) => {
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
    disableMfa: async (userId: string) => {
      try {
        await disableMfaMutation.mutateAsync(userId);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    setTempPassword: async (userId: string, password: string) => {
      try {
        await setTempPasswordMutation.mutateAsync({ userId, password });
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    forceChangePassword: async (params: { userId?: string; userIds?: string[] }) => {
      try {
        await forceChangeMutation.mutateAsync(params);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },
    generateResetLink: async (params: { userId?: string; userIds?: string[]; sendEmail: boolean; redirectTo?: string }) => {
      try {
        const data = await generateResetLinkMutation.mutateAsync(params);
        return { success: true, results: data.results };
      } catch (error) {
        return { success: false, error, results: [] as ResetLinkResult[] };
      }
    },
  };
};
