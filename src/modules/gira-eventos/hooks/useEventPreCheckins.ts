import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { EventPreCheckin } from '../types';

interface UsePreCheckinsParams {
  eventId?: string | null;
  formId?: string | null;
}

export function useEventPreCheckins({ eventId, formId }: UsePreCheckinsParams) {
  const queryClient = useQueryClient();
  const targetKey = eventId ? `event:${eventId}` : formId ? `form:${formId}` : 'none';

  const query = useQuery({
    queryKey: ['event-pre-checkins', targetKey],
    queryFn: async () => {
      let q = supabase.from('event_pre_checkins').select('*').order('confirmed_at', { ascending: false });
      if (eventId) q = q.eq('event_id', eventId);
      else if (formId) q = q.eq('form_id', formId);
      else return [] as EventPreCheckin[];
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as EventPreCheckin[];
    },
    enabled: !!(eventId || formId),
  });

  useEffect(() => {
    if (!eventId && !formId) return;
    const filter = eventId ? `event_id=eq.${eventId}` : `form_id=eq.${formId}`;
    const channel = supabase
      .channel(`pre-checkins-${targetKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_pre_checkins', filter }, () => {
        queryClient.invalidateQueries({ queryKey: ['event-pre-checkins', targetKey] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, formId, targetKey, queryClient]);

  const create = useMutation({
    mutationFn: async (payload: {
      event_id?: string | null;
      form_id?: string | null;
      registration_id?: string | null;
      response_id?: string | null;
      user_identifier: string;
      full_name: string;
      channel?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from('event_pre_checkins').insert({
        event_id: payload.event_id ?? null,
        form_id: payload.form_id ?? null,
        registration_id: payload.registration_id ?? null,
        response_id: payload.response_id ?? null,
        user_identifier: payload.user_identifier.trim().toLowerCase(),
        full_name: payload.full_name.trim(),
        channel: payload.channel ?? 'web',
        user_agent: navigator.userAgent,
        metadata: payload.metadata ?? {},
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-pre-checkins', targetKey] });
    },
    onError: (err: any) => {
      const msg = String(err?.message ?? '');
      if (msg.includes('unique') || msg.includes('duplicate')) {
        toast.info('Você já confirmou presença antecipada.');
      } else {
        toast.error('Não foi possível registrar o pré-checkin.');
      }
    },
  });

  return {
    preCheckins: query.data ?? [],
    isLoading: query.isLoading,
    create,
  };
}
