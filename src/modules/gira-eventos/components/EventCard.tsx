import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EVENT_CATEGORIES, EVENT_STATUS_LABELS } from '../types';
import type { GiraEvent } from '../types';

interface EventCardProps {
  event: GiraEvent;
  onClick: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const categoryLabel = EVENT_CATEGORIES.find(c => c.value === event.category)?.label ?? event.category;
  const statusColors: Record<string, string> = {
    ativo: 'bg-emerald-100 text-emerald-800',
    encerrado: 'bg-muted text-muted-foreground',
    cancelado: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={onClick}
    >
      {event.cover_image_url && (
        <div className="h-36 w-full overflow-hidden rounded-t-lg">
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2">{event.title}</h3>
          <Badge variant="outline" className={statusColors[event.status] ?? ''}>
            {EVENT_STATUS_LABELS[event.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span>{format(new Date(event.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
          {event.max_participants && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> máx. {event.max_participants}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
