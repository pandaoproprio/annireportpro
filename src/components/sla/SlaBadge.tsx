import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import type { SlaStatus } from '@/types/sla';
import { SLA_STATUS_LABELS, SLA_STATUS_COLORS } from '@/types/sla';

interface SlaBadgeProps {
  status: SlaStatus;
  deadlineAt?: string;
  compact?: boolean;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({ status, deadlineAt, compact }) => {
  const colors = SLA_STATUS_COLORS[status];
  const label = SLA_STATUS_LABELS[status];

  const icons: Record<SlaStatus, React.ReactNode> = {
    no_prazo: <CheckCircle className="w-3 h-3" />,
    atencao: <Clock className="w-3 h-3" />,
    atrasado: <AlertTriangle className="w-3 h-3" />,
    bloqueado: <XCircle className="w-3 h-3" />,
  };

  const timeText = deadlineAt ? getTimeText(deadlineAt) : '';

  return (
    <Badge
      className={`${colors.bg} ${colors.text} ${colors.border} border gap-1 font-medium`}
      variant="outline"
    >
      {icons[status]}
      {compact ? label : `${label}${timeText ? ` • ${timeText}` : ''}`}
    </Badge>
  );
};

function getTimeText(deadlineAt: string): string {
  const now = new Date();
  const deadline = new Date(deadlineAt);
  const diffMs = deadline.getTime() - now.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);

  if (totalHours > 48) {
    const days = Math.ceil(totalHours / 24);
    return `${days}d restantes`;
  }
  if (totalHours > 0) {
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    if (h === 0) return `${m}min restantes`;
    return m > 0 ? `${h}h${m}min restantes` : `${h}h restantes`;
  }

  const absTotalHours = Math.abs(totalHours);
  if (absTotalHours < 1) {
    return `${Math.round(absTotalHours * 60)}min em atraso`;
  }
  if (absTotalHours < 48) {
    const h = Math.floor(absTotalHours);
    return `${h}h em atraso`;
  }
  return `${Math.ceil(absTotalHours / 24)}d em atraso`;
}
