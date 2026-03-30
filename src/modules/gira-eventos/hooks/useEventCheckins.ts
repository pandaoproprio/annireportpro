import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { EventCheckin } from '../types';

export function useEventCheckins(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const checkinsQuery = useQuery({
    queryKey: ['event-checkins', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_checkins')
        .select('*')
        .eq('event_id', eventId!)
        .order('checkin_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EventCheckin[];
    },
    enabled: !!eventId,
  });

  // Realtime subscription for live dashboard
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`checkins-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_checkins',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['event-checkins', eventId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  const createCheckin = useMutation({
    mutationFn: async (checkin: Omit<EventCheckin, 'id' | 'checkin_at'>) => {
      const { error } = await supabase
        .from('event_checkins')
        .insert(checkin as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-checkins', eventId] });
    },
    onError: (err: any) => {
      if (err?.message?.includes('unique')) {
        toast.error('Este participante já fez check-in.');
      } else {
        toast.error('Erro ao registrar check-in');
      }
    },
  });

  return {
    checkins: checkinsQuery.data ?? [],
    isLoading: checkinsQuery.isLoading,
    createCheckin,
  };
}
