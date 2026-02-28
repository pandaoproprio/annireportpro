import { SlaReportType } from './sla';

export type PerformanceStatus = 'normal' | 'atencao' | 'critico';

export interface ReportPerformanceTracking {
  id: string;
  report_type: SlaReportType;
  report_id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  published_at: string | null;
  calculated_lead_time: number | null;
  calculated_cycle_time: number | null;
  reopen_count: number;
  priority: number;
  performance_status: PerformanceStatus;
  updated_at: string;
}

export interface CollaboratorRanking {
  user_id: string;
  name: string;
  published_count: number;
  avg_lead_time_hours: number;
  reopen_total: number;
}

export interface StaleDraft {
  report_id: string;
  report_type: SlaReportType;
  user_id: string;
  user_name: string;
  created_at: string;
  days_in_draft: number;
  hours_in_draft?: number;
}

export interface PerformanceSummary {
  avg_lead_time_hours: number;
  on_time_percentage: number;
  critical_drafts_count: number;
  overdue_count: number;
  collaborator_ranking: CollaboratorRanking[];
  stale_drafts: StaleDraft[];
}
