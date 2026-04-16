import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowUpCircle, CheckCircle, AlertTriangle, Plus, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRiskLevel, STATUS_LABELS } from '@/hooks/useProjectRisks';

interface Risk {
  id: string;
  title: string;
  status: string;
  probability: string;
  impact: string;
  created_at: string;
  resolved_at?: string | null;
  escalated_at?: string | null;
  escalated_to?: string | null;
  project_name?: string;
}

interface TimelineEvent {
  date: Date;
  type: 'created' | 'escalated' | 'resolved' | 'materialized';
  riskTitle: string;
  riskId: string;
  detail?: string;
  projectName?: string;
}

interface Props {
  risks: Risk[];
}

const iconMap = {
  created: <Plus className="w-3.5 h-3.5 text-primary" />,
  escalated: <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />,
  resolved: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  materialized: <AlertTriangle className="w-3.5 h-3.5 text-destructive" />,
};

const typeLabel = {
  created: 'Identificado',
  escalated: 'Escalado',
  resolved: 'Resolvido',
  materialized: 'Materializado',
};

const typeColor = {
  created: 'bg-primary/10 border-primary/30',
  escalated: 'bg-orange-50 border-orange-300 dark:bg-orange-500/10 dark:border-orange-500/30',
  resolved: 'bg-green-50 border-green-300 dark:bg-green-500/10 dark:border-green-500/30',
  materialized: 'bg-destructive/5 border-destructive/30',
};

export const RiskMitigationTimeline: React.FC<Props> = ({ risks }) => {
  const events = useMemo(() => {
    const all: TimelineEvent[] = [];

    for (const r of risks) {
      all.push({
        date: new Date(r.created_at),
        type: 'created',
        riskTitle: r.title,
        riskId: r.id,
        projectName: r.project_name,
      });

      if (r.escalated_at) {
        all.push({
          date: new Date(r.escalated_at),
          type: 'escalated',
          riskTitle: r.title,
          riskId: r.id,
          detail: r.escalated_to ? `Para: ${r.escalated_to}` : undefined,
          projectName: r.project_name,
        });
      }

      if (r.resolved_at) {
        all.push({
          date: new Date(r.resolved_at),
          type: 'resolved',
          riskTitle: r.title,
          riskId: r.id,
          projectName: r.project_name,
        });
      }

      if (r.status === 'materializado') {
        all.push({
          date: new Date(r.created_at),
          type: 'materialized',
          riskTitle: r.title,
          riskId: r.id,
          projectName: r.project_name,
        });
      }
    }

    return all.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30);
  }, [risks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Timeline de Ações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem eventos registrados.</p>
        ) : (
          <div className="relative ml-4 max-h-96 overflow-y-auto">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-3">
              {events.map((evt, i) => (
                <div key={`${evt.riskId}-${evt.type}-${i}`} className="relative pl-8">
                  {/* Dot */}
                  <div className={`absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center border ${typeColor[evt.type]}`}>
                    {iconMap[evt.type]}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{evt.riskTitle}</span>
                      <Badge variant="outline" className="text-[10px]">{typeLabel[evt.type]}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {format(evt.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {evt.projectName && (
                        <span className="text-[10px] text-primary/70">📁 {evt.projectName}</span>
                      )}
                    </div>
                    {evt.detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{evt.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
