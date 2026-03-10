import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GiraEvent } from '../types';

interface EventCalendarProps {
  events: GiraEvent[];
  onSelectEvent: (event: GiraEvent) => void;
}

export const EventCalendar: React.FC<EventCalendarProps> = ({ events, onSelectEvent }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDow = getDay(days[0]);
  const blanks = Array.from({ length: startDow }, (_, i) => i);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const prev = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
        <h3 className="font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
        {weekDays.map(d => <div key={d} className="font-medium py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(i => <div key={`b-${i}`} />)}
        {days.map(day => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), day));
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[60px] p-1 rounded text-xs border border-transparent',
                isToday && 'bg-primary/10 border-primary/30',
                !isSameMonth(day, currentMonth) && 'opacity-40',
              )}
            >
              <span className={cn('block text-right text-muted-foreground', isToday && 'font-bold text-primary')}>
                {format(day, 'd')}
              </span>
              {dayEvents.slice(0, 2).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className="block w-full text-left truncate text-[10px] bg-primary/15 text-primary rounded px-1 mt-0.5 hover:bg-primary/25 transition-colors"
                >
                  {ev.title}
                </button>
              ))}
              {dayEvents.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
