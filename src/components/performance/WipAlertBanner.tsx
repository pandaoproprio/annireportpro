import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WipAlertBannerProps {
  wipCount: number;
  wipLimit?: number;
}

export const WipAlertBanner: React.FC<WipAlertBannerProps> = ({ wipCount, wipLimit = 5 }) => {
  if (wipCount <= wipLimit) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card text-foreground border-warning/40">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning" />
      <div className="text-sm">
        <span className="font-semibold">Alerta de WIP:</span> Você possui{' '}
        <span className="font-bold">{wipCount}</span> rascunhos em aberto (limite: {wipLimit}). Considere finalizar alguns antes de criar novos.
      </div>
    </div>
  );
};
