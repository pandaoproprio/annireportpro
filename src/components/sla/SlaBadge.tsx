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

  const daysText = deadlineAt ? getDaysText(deadlineAt) : '';

  return (
    <Badge
      className={`${colors.bg} ${colors.text} ${colors.border} border gap-1 font-medium`}
      variant="outline"
    >
      {icons[status]}
      {compact ? label : `${label}${daysText ? ` • ${daysText}` : ''}`}
    </Badge>
  );
};

function getDaysText(deadlineAt: string): string {
  const now = new Date();
  const deadline = new Date(deadlineAt);
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `${diff}d restantes`;
  if (diff === 0) return 'Vence hoje';
  return `${Math.abs(diff)}d em atraso`;
}
