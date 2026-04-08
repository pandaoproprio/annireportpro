import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEvents } from './hooks/useEvents';
import { useEventRegistrations } from './hooks/useEventRegistrations';
import { useEventCheckins } from './hooks/useEventCheckins';
import { useEventCertificates } from './hooks/useEventCertificates';
import { useAppData } from '@/contexts/AppDataContext';
import { EventForm } from './components/EventForm';
import { RegistrationsList } from './components/RegistrationsList';
import { EventDashboard } from './components/EventDashboard';
import { QrCodeDisplay } from './components/QrCodeDisplay';
import { exportAttendancePdf } from './components/AttendancePdfExport';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, ExternalLink, CalendarDays, MapPin, Copy, QrCode, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EVENT_STATUS_LABELS } from './types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, isLoading, updateEvent, deleteEvent } = useEvents();
  const { registrations, isLoading: regsLoading, deleteRegistration } = useEventRegistrations(id);
  const { checkins } = useEventCheckins(id);
  const { certificates, generateCertificates } = useEventCertificates(id);
  const { projects } = useAppData();
  const [editing, setEditing] = useState(false);
  const [qrDialogReg, setQrDialogReg] = useState<{ id: string; name: string; qr_token: string } | null>(null);
  const [sendingEmails, setSendingEmails] = useState(false);

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
        linked_form_id: data.linked_form_id || null,
        max_participants: data.max_participants ? Number(data.max_participants) : null,
        event_date: new Date(data.event_date).toISOString(),
        event_end_date: data.event_end_date ? new Date(data.event_end_date).toISOString() : null,
        cover_image_url: data.cover_image_url || null,
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

  const handleSendConfirmationEmails = async () => {
    const regsWithEmail = registrations.filter(r => r.email);
    if (regsWithEmail.length === 0) {
      toast.error('Nenhuma inscrição com e-mail cadastrado.');
      return;
    }

    setSendingEmails(true);
    try {
      const { error } = await supabase.functions.invoke('send-event-confirmation', {
        body: {
          event_id: event.id,
          event_title: event.title,
          event_date: event.event_date,
          event_location: event.location,
          registrations: regsWithEmail.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            qr_token: r.qr_token,
          })),
        },
      });
      if (error) throw error;
      toast.success(`E-mails de confirmação enviados para ${regsWithEmail.length} inscritos!`);
    } catch (err) {
      toast.error('Erro ao enviar e-mails de confirmação.');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleExportAttendancePdf = () => {
    exportAttendancePdf(event, registrations, checkins);
    toast.success('PDF de lista de presença gerado!');
  };

  const handleGenerateCertificates = () => {
    generateCertificates.mutate({ event, checkins });
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
          <TabsTrigger value="dashboard">Dashboard ({checkins.length})</TabsTrigger>
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

              <div className="flex flex-wrap gap-2">
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

        <TabsContent value="registrations" className="mt-4 space-y-4">
          {/* Actions bar */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendConfirmationEmails}
              disabled={sendingEmails || registrations.length === 0}
            >
              <Send className="w-4 h-4 mr-1" />
              {sendingEmails ? 'Enviando...' : 'Enviar QR Codes por E-mail'}
            </Button>
          </div>

          {regsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <RegistrationsList
                registrations={registrations}
                onDelete={id => deleteRegistration.mutate(id)}
                isLoading={deleteRegistration.isPending}
                onShowQr={(reg) => setQrDialogReg(reg as any)}
                checkins={checkins}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <EventDashboard
            event={event}
            registrations={registrations}
            checkins={checkins}
            certificates={certificates}
            onGenerateCertificates={handleGenerateCertificates}
            isGenerating={generateCertificates.isPending}
            onExportAttendancePdf={handleExportAttendancePdf}
          />
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={!!qrDialogReg} onOpenChange={() => setQrDialogReg(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code - {qrDialogReg?.name}</DialogTitle>
          </DialogHeader>
          {qrDialogReg?.qr_token && (
            <div className="flex flex-col items-center gap-3 py-4">
              <QrCodeDisplay
                value={`${window.location.origin}/checkin/${event.id}?token=${qrDialogReg.qr_token}`}
                size={250}
              />
              <p className="text-xs text-muted-foreground text-center">
                Escaneie este QR Code para realizar o check-in no evento.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetailPage;
