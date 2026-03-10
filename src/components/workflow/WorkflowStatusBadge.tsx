import { Badge } from '@/components/ui/badge';
import { FileEdit, Eye, CheckCircle2, Globe, RotateCcw } from 'lucide-react';
import type { WorkflowStatus } from '@/hooks/useReportWorkflow';

const CONFIG: Record<WorkflowStatus, { label: string; icon: React.ReactNode; className: string }> = {
  rascunho: {
    label: 'Rascunho',
    icon: <FileEdit className="w-3 h-3" />,
    className: 'bg-muted text-muted-foreground border-border',
  },
  em_revisao: {
    label: 'Em Revisão',
    icon: <Eye className="w-3 h-3" />,
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  aprovado: {
    label: 'Aprovado',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  },
  publicado: {
    label: 'Publicado',
    icon: <Globe className="w-3 h-3" />,
    className: 'bg-primary/10 text-primary border-primary/30',
  },
  devolvido: {
    label: 'Devolvido',
    icon: <RotateCcw className="w-3 h-3" />,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const cfg = CONFIG[status];
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}
