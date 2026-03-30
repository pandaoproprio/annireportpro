import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EventCertificate, EventCheckin, GiraEvent } from '../types';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useEventCertificates(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const certificatesQuery = useQuery({
    queryKey: ['event-certificates', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_certificates')
        .select('*')
        .eq('event_id', eventId!)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EventCertificate[];
    },
    enabled: !!eventId,
  });

  const generateCertificates = useMutation({
    mutationFn: async ({ event, checkins }: { event: GiraEvent; checkins: EventCheckin[] }) => {
      const existing = certificatesQuery.data ?? [];
      const existingRegIds = new Set(existing.map(c => c.registration_id));
      const newCheckins = checkins.filter(c => !existingRegIds.has(c.registration_id));

      if (newCheckins.length === 0) {
        toast.info('Todos os certificados já foram gerados.');
        return;
      }

      const durationHours = event.event_end_date
        ? Math.round((new Date(event.event_end_date).getTime() - new Date(event.event_date).getTime()) / 3600000 * 10) / 10
        : null;

      const certs = await Promise.all(newCheckins.map(async (checkin) => {
        const certData = `${checkin.id}|${event.id}|${checkin.full_name}|${event.title}|${event.event_date}`;
        const hash = await sha256(certData);
        const verificationUrl = `${window.location.origin}/certificado/${hash}`;
        return {
          event_id: event.id,
          registration_id: checkin.registration_id,
          checkin_id: checkin.id,
          certificate_hash: hash,
          participant_name: checkin.full_name,
          participant_document: checkin.document_number,
          event_title: event.title,
          event_date: event.event_date,
          event_duration_hours: durationHours,
          verification_url: verificationUrl,
        };
      }));

      const { error } = await supabase
        .from('event_certificates')
        .insert(certs as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-certificates', eventId] });
      toast.success('Certificados gerados com sucesso!');
    },
    onError: () => toast.error('Erro ao gerar certificados'),
  });

  return {
    certificates: certificatesQuery.data ?? [],
    isLoading: certificatesQuery.isLoading,
    generateCertificates,
  };
}
