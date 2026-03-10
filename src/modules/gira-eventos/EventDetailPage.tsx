import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from './hooks/useEvents';
import { useEventRegistrations } from './hooks/useEventRegistrations';
import { useAppData } from '@/contexts/AppDataContext';
import { EventForm } from './components/EventForm';
import { RegistrationsList } from './components/RegistrationsList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Trash2, ExternalLink, CalendarDays, MapPin, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EVENT_STATUS_LABELS } from './types';
import { toast } from 'sonner';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, isLoading, updateEvent, deleteEvent } = useEvents();
  const { registrations, isLoading: regsLoading, deleteRegistration } = useEventRegistrations(id);
  const { projects } = useAppData();
  const [editing, setEditing] = useState(false);

  const event = events.find(e => e.id === id);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Evento não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/eventos')}>Voltar</Button>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/e/${event.id}`;

  const handleUpdate = (data: any) => {
    updateEvent.mutate(
      {
        id: event.id,
        ...data,
        project_id: data.project_id || null,
        max_participants: data.max_participants ? Number(data.max_participants) : null,
        event_date: new Date(data.event_date).toISOString(),
        event_end_date: data.event_end_date ? new Date(data.event_end_date).toISOString() : null,
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleDelete = () => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    deleteEvent.mutate(event.id, { onSuccess: () => navigate('/eventos') });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/eventos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground flex-1 truncate">{event.title}</h1>
        <Badge variant="outline">{EVENT_STATUS_LABELS[event.status]}</Badge>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="registrations">Inscrições ({registrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          {editing ? (
            <Card>
              <CardHeader><CardTitle>Editar Evento</CardTitle></CardHeader>
              <CardContent>
                <EventForm
                  defaultValues={event}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(false)}
                  isLoading={updateEvent.isPending}
                  projects={projects}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {event.cover_image_url && (
                    <img src={event.cover_image_url} alt="" className="w-full h-48 object-cover rounded-lg" />
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    <span>{format(new Date(event.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    {event.event_end_date && (
                      <span>— {format(new Date(event.event_end_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    )}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.description && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
                  )}
                  {event.max_participants && (
                    <p className="text-xs text-muted-foreground">
                      Vagas: {registrations.length}/{event.max_participants}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium mb-2">Link público de inscrição</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded truncate">{publicUrl}</code>
                    <Button variant="outline" size="sm" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="registrations" className="mt-4">
          {regsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <RegistrationsList
              registrations={registrations}
              onDelete={id => deleteRegistration.mutate(id)}
              isLoading={deleteRegistration.isPending}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventDetailPage;
