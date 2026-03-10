import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EventRegistration } from '../types';

export function useEventRegistrations(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const registrationsQuery = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId!)
        .order('registered_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EventRegistration[];
    },
    enabled: !!eventId,
  });

  const createRegistration = useMutation({
    mutationFn: async (reg: Omit<EventRegistration, 'id' | 'registered_at'>) => {
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from('event_registrations')
        .insert({ id, ...reg } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
    },
    onError: () => toast.error('Erro ao registrar inscrição'),
  });

  const deleteRegistration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_registrations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
      toast.success('Inscrição removida!');
    },
    onError: () => toast.error('Erro ao remover inscrição'),
  });

  return {
    registrations: registrationsQuery.data ?? [],
    isLoading: registrationsQuery.isLoading,
    createRegistration,
    deleteRegistration,
  };
}
