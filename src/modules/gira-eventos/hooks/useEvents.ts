import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { GiraEvent } from '../types';

export function useEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['gira-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data as unknown as GiraEvent[];
    },
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Omit<GiraEvent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gira-events'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar evento'),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GiraEvent> & { id: string }) => {
      const { error } = await supabase
        .from('events')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gira-events'] });
      toast.success('Evento atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar evento'),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gira-events'] });
      toast.success('Evento excluído!');
    },
    onError: () => toast.error('Erro ao excluir evento'),
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
