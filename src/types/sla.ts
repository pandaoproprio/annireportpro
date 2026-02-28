export type SlaReportType = 'report_object' | 'report_team' | 'justification';
export type SlaStatus = 'no_prazo' | 'atencao' | 'atrasado' | 'bloqueado';

export interface SlaConfig {
  id: string;
  report_type: SlaReportType;
  default_days: number;
  default_hours: number;
  warning_days: number;
  warning_hours: number;
  escalation_days: number;
  escalation_hours: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SlaTracking {
  id: string;
  report_type: SlaReportType;
  report_id: string;
  project_id: string;
  user_id: string;
  deadline_at: string;
  status: SlaStatus;
  escalated_at: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export const SLA_REPORT_TYPE_LABELS: Record<SlaReportType, string> = {
  report_object: 'Relatório do Objeto',
  report_team: 'Relatório da Equipe',
  justification: 'Justificativa de Prorrogação',
};

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  no_prazo: 'No Prazo',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  bloqueado: 'Bloqueado',
};

export const SLA_STATUS_COLORS: Record<SlaStatus, { bg: string; text: string; border: string }> = {
  no_prazo: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  atencao: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  atrasado: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  bloqueado: { bg: 'bg-red-200', text: 'text-red-900', border: 'border-red-500' },
};

/** Converts days+hours config to total hours */
export function slaConfigToTotalHours(days: number, hours: number): number {
  return days * 24 + hours;
}

/** Formats a duration in hours to a human-readable string */
export function formatSlaDuration(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  return parts.join(' ') || '0h';
}
