import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin' | 'oficineiro';
  createdAt: string;
  lastSignIn: string | null;
  emailConfirmed: boolean;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'GET'
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao carregar usuários'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createUser = async (userData: {
    email: string;
    password?: string;
    name: string;
    role: 'user' | 'admin' | 'super_admin' | 'oficineiro';
    sendInvite?: boolean;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'POST',
        body: userData
      });

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: userData.sendInvite 
          ? 'Convite enviado com sucesso!' 
          : 'Usuário criado com sucesso!'
      });
      
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar usuário'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: { name?: string; role?: 'user' | 'admin' | 'super_admin' | 'oficineiro'; password?: string }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'PATCH',
        body: { userId, ...updates }
      });

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: updates.password ? 'Senha redefinida com sucesso!' : 'Usuário atualizado com sucesso!'
      });
      
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao atualizar usuário'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'DELETE',
        body: { userId }
      });

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Usuário removido com sucesso!'
      });
      
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao remover usuário'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    users,
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
};
