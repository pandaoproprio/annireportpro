import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RegistrationForm } from './components/RegistrationForm';
import { useEventRegistrations } from './hooks/useEventRegistrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GiraEvent } from './types';

const PublicEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [submitted, setSubmitted] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['public-event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as GiraEvent;
    },
    enabled: !!id,
  });

  const { registrations, createRegistration } = useEventRegistrations(id);
  const event = eventQuery.data;

  const handleRegister = (data: { name: string; email: string; phone: string; document: string }) => {
    createRegistration.mutate(
      { event_id: id!, ...data, status: 'confirmado', user_id: null },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-lg" />
      </div>
    );
  }

  if (!event || event.status !== 'ativo') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Este evento não está disponível para inscrições.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxReached = event.max_participants ? registrations.length >= event.max_participants : false;

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        {event.cover_image_url && (
          <div className="h-48 w-full overflow-hidden rounded-t-lg">
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>{format(new Date(event.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
          {event.description && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{event.description}</p>}
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-semibold text-foreground">Inscrição confirmada!</p>
              <p className="text-sm text-muted-foreground">Sua inscrição foi registrada com sucesso.</p>
            </div>
          ) : (
            <RegistrationForm
              onSubmit={handleRegister}
              isLoading={createRegistration.isPending}
              maxReached={maxReached}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicEventPage;
