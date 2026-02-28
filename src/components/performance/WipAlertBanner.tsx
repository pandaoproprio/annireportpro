import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WipAlertBannerProps {
  wipCount: number;
}

export const WipAlertBanner: React.FC<WipAlertBannerProps> = ({ wipCount }) => {
  if (wipCount <= 5) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <div className="text-sm">
        <span className="font-semibold">Alerta de WIP:</span> Você possui{' '}
        <span className="font-bold">{wipCount}</span> rascunhos em aberto. Considere finalizar alguns antes de criar novos.
      </div>
    </div>
  );
};
