import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarDays } from 'lucide-react';
import { format, eachDayOfInterval, subMonths, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  activities: Array<{ date: string }>;
}

export function ActivityHeatmap({ activities }: Props) {
  const { weeks, maxCount } = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    const days = eachDayOfInterval({ start: startOfWeek(start, { weekStartsOn: 0 }), end: endOfWeek(end, { weekStartsOn: 0 }) });

    const countByDate = activities.reduce<Record<string, number>>((acc, a) => {
      const key = a.date?.substring(0, 10);
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    let max = 0;
    const weeks: Array<Array<{ date: Date; count: number; key: string }>> = [];
    let currentWeek: Array<{ date: Date; count: number; key: string }> = [];

    days.forEach((day, i) => {
      const key = format(day, 'yyyy-MM-dd');
      const count = countByDate[key] || 0;
      if (count > max) max = count;
      currentWeek.push({ date: day, count, key });
      if (getDay(day) === 6 || i === days.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return { weeks, maxCount: max };
  }, [activities]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    const ratio = count / Math.max(maxCount, 1);
    if (ratio <= 0.25) return 'bg-primary/20';
    if (ratio <= 0.5) return 'bg-primary/40';
    if (ratio <= 0.75) return 'bg-primary/60';
    return 'bg-primary';
  };

  const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Mapa de Atividades (6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAY_LABELS.map((l, i) => (
                <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-muted-foreground">
                  {i % 2 === 1 ? l : ''}
                </div>
              ))}
            </div>
            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map(day => (
                  <Tooltip key={day.key}>
                    <TooltipTrigger asChild>
                      <div className={`w-3 h-3 rounded-[2px] ${getColor(day.count)} transition-colors cursor-default`} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{format(day.date, "dd 'de' MMMM", { locale: ptBR })}</p>
                      <p className="text-muted-foreground">{day.count} atividade{day.count !== 1 ? 's' : ''}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <span>Menos</span>
          <div className="w-3 h-3 rounded-[2px] bg-muted" />
          <div className="w-3 h-3 rounded-[2px] bg-primary/20" />
          <div className="w-3 h-3 rounded-[2px] bg-primary/40" />
          <div className="w-3 h-3 rounded-[2px] bg-primary/60" />
          <div className="w-3 h-3 rounded-[2px] bg-primary" />
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
