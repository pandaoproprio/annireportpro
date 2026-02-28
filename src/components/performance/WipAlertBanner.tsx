import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { SLA_REPORT_TYPE_LABELS } from '@/types/sla';
import type { WipDraft } from '@/hooks/usePerformanceTracking';

interface WipAlertBannerProps {
  wipCount: number;
  wipLimit?: number;
  wipDrafts?: WipDraft[];
}

export const WipAlertBanner: React.FC<WipAlertBannerProps> = ({ wipCount, wipLimit = 5, wipDrafts = [] }) => {
  if (wipCount <= wipLimit) return null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-foreground border-warning/40">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning" />
        <div className="text-sm">
          <span className="font-semibold">Alerta de WIP:</span> Você possui{' '}
          <span className="font-bold">{wipCount}</span> rascunhos em aberto (limite: {wipLimit}). Considere finalizar alguns antes de criar novos.
        </div>
      </div>
      {wipDrafts.length > 0 && (
        <ul className="ml-8 space-y-1">
          {wipDrafts.map(d => {
            const hoursAgo = Math.round((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60));
            const ageLabel = hoursAgo < 24 ? `${hoursAgo}h` : `${Math.floor(hoursAgo / 24)}d ${hoursAgo % 24}h`;
            return (
              <li key={d.id} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block flex-shrink-0" />
                <span className="font-medium text-foreground">{SLA_REPORT_TYPE_LABELS[d.report_type]}</span>
                {d.provider_name && <span>— {d.provider_name}</span>}
                <span className="text-muted-foreground">({ageLabel} atrás)</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
