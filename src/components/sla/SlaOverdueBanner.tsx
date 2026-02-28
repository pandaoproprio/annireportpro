import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { SlaTracking } from '@/types/sla';
import { SLA_REPORT_TYPE_LABELS } from '@/types/sla';

interface SlaOverdueBannerProps {
  overdueItems: SlaTracking[];
}

export const SlaOverdueBanner: React.FC<SlaOverdueBannerProps> = ({ overdueItems }) => {
  if (overdueItems.length === 0) return null;

  const blocked = overdueItems.filter(i => i.status === 'bloqueado').length;
  const overdue = overdueItems.filter(i => i.status === 'atrasado').length;

  return (
    <Alert variant="destructive" className="border-red-300 bg-red-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Relatórios com SLA crítico</AlertTitle>
      <AlertDescription>
        Você possui{' '}
        {overdue > 0 && <strong>{overdue} relatório(s) atrasado(s)</strong>}
        {overdue > 0 && blocked > 0 && ' e '}
        {blocked > 0 && <strong>{blocked} relatório(s) bloqueado(s)</strong>}
        . Finalize-os o mais rápido possível.
        <ul className="mt-2 space-y-1 text-sm">
          {overdueItems.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className={item.status === 'bloqueado' ? 'text-red-900 font-bold' : 'text-red-700'}>
                • {SLA_REPORT_TYPE_LABELS[item.report_type]} — vencido em{' '}
                {new Date(item.deadline_at).toLocaleDateString('pt-BR')}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
