import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSlaTracking } from '@/hooks/useSlaTracking';

/**
 * Shows a toast notification on login if there are overdue SLA items.
 * Render this once in the authenticated layout.
 */
export const SlaLoginToast: React.FC = () => {
  const { getOverdueTrackings } = useSlaTracking();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const overdueItems = getOverdueTrackings();
    if (overdueItems.length > 0) {
      shown.current = true;
      const blocked = overdueItems.filter(i => i.status === 'bloqueado').length;
      const overdue = overdueItems.filter(i => i.status === 'atrasado').length;

      const parts: string[] = [];
      if (overdue > 0) parts.push(`${overdue} atrasado(s)`);
      if (blocked > 0) parts.push(`${blocked} bloqueado(s)`);

      toast.warning(`⚠️ Você possui ${parts.join(' e ')} relatório(s) com SLA crítico.`, {
        duration: 8000,
      });
    }
  }, [getOverdueTrackings]);

  return null;
};
