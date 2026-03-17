import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProjectRisk } from '@/hooks/useProjectRisks';
import { getRiskLevel } from '@/hooks/useProjectRisks';

interface RiskCalendarProps {
  risks: ProjectRisk[];
}

export const RiskCalendar: React.FC<RiskCalendarProps> = ({ risks }) => {
  const calendarItems = useMemo(() => {
    const items: Array<{
      date: Date;
      title: string;
      riskTitle: string;
      type: 'deadline' | 'overdue' | 'upcoming';
      level: string;
      riskId: string;
    }> = [];

    risks
      .filter(r => r.due_date && r.status !== 'resolvido')
      .forEach(r => {
        const d = new Date(r.due_date!);
        const rl = getRiskLevel(r.probability, r.impact);
        const isOverdue = isPast(d) && !isToday(d);
        const isUpcoming = !isPast(d) && isBefore(d, addDays(new Date(), 7));

        items.push({
          date: d,
          title: isOverdue ? 'Prazo vencido' : isUpcoming ? 'Prazo próximo' : 'Prazo previsto',
          riskTitle: r.title,
          type: isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : 'deadline',
          level: rl.level,
          riskId: r.id,
        });
      });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [risks]);

  const overdueItems = calendarItems.filter(i => i.type === 'overdue');
  const upcomingItems = calendarItems.filter(i => i.type === 'upcoming');
  const futureItems = calendarItems.filter(i => i.type === 'deadline');

  const risksWithoutDeadline = risks.filter(r => !r.due_date && r.status !== 'resolvido');

  if (calendarItems.length === 0 && risksWithoutDeadline.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum prazo registrado. Adicione prazos aos riscos para visualizar o calendário.</p>
        </CardContent>
      </Card>
    );
  }

  const renderItem = (item: typeof calendarItems[0]) => (
    <div key={`${item.riskId}-${item.type}`} className={`flex items-center gap-3 p-3 rounded-lg border ${
      item.type === 'overdue' ? 'bg-destructive/5 border-destructive/20' :
      item.type === 'upcoming' ? 'bg-orange-50 dark:bg-orange-500/5 border-orange-300/30' :
      'bg-muted/50 border-border'
    }`}>
      {item.type === 'overdue' ? (
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
      ) : item.type === 'upcoming' ? (
        <Clock className="w-5 h-5 text-orange-500 shrink-0" />
      ) : (
        <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.riskTitle}</p>
        <p className="text-xs text-muted-foreground">{item.title}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono">{format(item.date, 'dd/MM/yyyy')}</p>
        <Badge variant="outline" className="text-xs">{item.level}</Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {overdueItems.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Prazos Vencidos ({overdueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueItems.map(renderItem)}
          </CardContent>
        </Card>
      )}

      {upcomingItems.length > 0 && (
        <Card className="border-orange-300/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
              <Clock className="w-4 h-4" />
              Próximos 7 Dias ({upcomingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingItems.map(renderItem)}
          </CardContent>
        </Card>
      )}

      {futureItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Prazos Futuros ({futureItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {futureItems.map(renderItem)}
          </CardContent>
        </Card>
      )}

      {risksWithoutDeadline.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" />
              Sem Prazo Definido ({risksWithoutDeadline.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {risksWithoutDeadline.map(r => (
                <p key={r.id} className="text-sm text-muted-foreground">• {r.title}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
