import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export interface FormNotification {
  id: string;
  form_id: string;
  form_response_id: string;
  recipient_user_id: string;
  form_title: string;
  respondent_name: string | null;
  respondent_email: string | null;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export function useFormNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['form-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_notifications')
        .select('*')
        .eq('recipient_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as FormNotification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('form-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['form-notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const unreadCount = (query.data || []).filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-notifications', user?.id] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('form_notifications')
        .update({ is_read: true })
        .eq('recipient_user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-notifications', user?.id] }),
  });

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead,
  };
}
