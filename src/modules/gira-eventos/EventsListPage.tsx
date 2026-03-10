import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useEvents } from './hooks/useEvents';
import { EventCard } from './components/EventCard';
import { EventForm } from './components/EventForm';
import { EventCalendar } from './components/EventCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, CalendarDays, LayoutGrid } from 'lucide-react';

const EventsListPage: React.FC = () => {
  const { user } = useAuth();
  const { projects } = useAppData();
  const { events, isLoading, createEvent } = useEvents();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (data: any) => {
    createEvent.mutate(
      {
        ...data,
        user_id: user!.id,
        project_id: data.project_id || null,
        max_participants: data.max_participants ? Number(data.max_participants) : null,
        event_date: new Date(data.event_date).toISOString(),
        event_end_date: data.event_end_date ? new Date(data.event_end_date).toISOString() : null,
        settings: {},
        cover_image_url: data.cover_image_url || null,
      },
      { onSuccess: () => setShowCreate(false) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GIRA Eventos</h1>
          <p className="text-muted-foreground text-sm">Gerencie eventos, inscrições e agenda</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <PlusCircle className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar eventos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid"><LayoutGrid className="w-4 h-4 mr-1" /> Cards</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="w-4 h-4 mr-1" /> Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(ev => (
                <EventCard key={ev.id} event={ev} onClick={() => navigate(`/eventos/${ev.id}`)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <EventCalendar events={filtered} onSelectEvent={ev => navigate(`/eventos/${ev.id}`)} />
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
          <EventForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            isLoading={createEvent.isPending}
            projects={projects}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsListPage;
