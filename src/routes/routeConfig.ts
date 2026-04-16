import { lazy } from 'react';
import type { AppPermission } from '@/hooks/usePermissions';

// Lazy-loaded page components
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ActivityManager = lazy(() => import('@/pages/ActivityManager').then(m => ({ default: m.ActivityManager })));
const ReportGenerator = lazy(() => import('@/pages/ReportGenerator').then(m => ({ default: m.ReportGenerator })));
const TeamReportGenerator = lazy(() => import('@/pages/TeamReportGenerator').then(m => ({ default: m.TeamReportGenerator })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const UserManagement = lazy(() => import('@/pages/UserManagement').then(m => ({ default: m.UserManagement })));
const TeamManagement = lazy(() => import('@/pages/TeamManagement').then(m => ({ default: m.TeamManagement })));
const SystemLogs = lazy(() => import('@/pages/SystemLogs').then(m => ({ default: m.SystemLogs })));
const JustificationReportGenerator = lazy(() => import('@/pages/JustificationReportGenerator').then(m => ({ default: m.JustificationReportGenerator })));
const ReportTemplates = lazy(() => import('@/pages/ReportTemplates').then(m => ({ default: m.ReportTemplates })));
const ReportTemplateEditor = lazy(() => import('@/pages/ReportTemplateEditor').then(m => ({ default: m.ReportTemplateEditor })));
const DocumentEditorPage = lazy(() => import('@/pages/DocumentEditorPage'));
const WysiwygEditorPage = lazy(() => import('@/pages/WysiwygEditorPage'));
const ReportV2Page = lazy(() => import('@/modules/reports-v2/ReportV2Page'));
const ReportObjetoIIPage = lazy(() => import('@/modules/report-objeto-ii/ReportObjetoIIPage'));
const FormsListPage = lazy(() => import('@/modules/gira-forms/FormsListPage'));
const FormBuilderPage = lazy(() => import('@/modules/gira-forms/FormBuilderPage'));
const EventsListPage = lazy(() => import('@/modules/gira-eventos/EventsListPage'));
const EventDetailPage = lazy(() => import('@/modules/gira-eventos/EventDetailPage'));
const AutomatoDashboard = lazy(() => import('@/pages/AutomatoDashboard'));
const RiskManagement = lazy(() => import('@/pages/RiskManagement'));
const GlobalRiskDashboard = lazy(() => import('@/pages/GlobalRiskDashboard'));
const BudgetDashboard = lazy(() => import('@/pages/BudgetDashboard'));
const BudgetAdjustmentPage = lazy(() => import('@/pages/BudgetAdjustmentPage'));
const SprintDashboard = lazy(() => import('@/pages/SprintDashboard'));
const RetrospectivesPage = lazy(() => import('@/pages/RetrospectivesPage'));
const MaturityAuditReport = lazy(() => import('@/pages/MaturityAuditReport'));
const AiAuditReport = lazy(() => import('@/pages/AiAuditReport'));
const ValuationReport = lazy(() => import('@/pages/ValuationReport'));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'));
const MessagingPage = lazy(() => import('@/pages/MessagingPage'));
const ObservabilityDashboard = lazy(() => import('@/pages/ObservabilityDashboard'));
const ProductivityMonitoringPage = lazy(() => import('@/pages/ProductivityMonitoringPage'));
const GovDataDashboard = lazy(() => import('@/pages/GovDataDashboard'));
export interface RouteEntry {
  path: string;
  element: React.LazyExoticComponent<React.ComponentType<any>>;
  permission?: AppPermission;
}

/**
 * All routes rendered inside the authenticated MainLayout.
 * Adding or removing a route here will NOT affect the Sidebar or Layout.
 */
export const protectedRoutes: RouteEntry[] = [
  { path: '/', element: Dashboard },
  { path: '/activities', element: ActivityManager, permission: 'diary' },
  { path: '/report', element: ReportGenerator, permission: 'report_object' },
  { path: '/team-report', element: TeamReportGenerator, permission: 'report_team' },
  { path: '/justificativa', element: JustificationReportGenerator, permission: 'report_team' },
  { path: '/settings', element: Settings, permission: 'settings_edit' },
  { path: '/users', element: UserManagement, permission: 'user_management' },
  { path: '/team', element: TeamManagement, permission: 'team_management' },
  { path: '/templates', element: ReportTemplates },
  { path: '/templates/:id', element: ReportTemplateEditor },
  { path: '/logs', element: SystemLogs, permission: 'system_logs' },
  { path: '/editor/:id', element: DocumentEditorPage },
  { path: '/editor', element: DocumentEditorPage },
  { path: '/wysiwyg/:id', element: WysiwygEditorPage },
  { path: '/wysiwyg', element: WysiwygEditorPage },
  { path: '/report-v2', element: ReportV2Page, permission: 'report_object' },
  { path: '/report-objeto-ii', element: ReportObjetoIIPage, permission: 'report_object' },
  { path: '/forms', element: FormsListPage, permission: 'forms_view' },
  { path: '/forms/:id', element: FormBuilderPage, permission: 'forms_view' },
  { path: '/eventos', element: EventsListPage, permission: 'events_view' },
  { path: '/eventos/:id', element: EventDetailPage, permission: 'events_view' },
  { path: '/automato', element: AutomatoDashboard, permission: 'system_logs' },
  { path: '/risks', element: RiskManagement },
  { path: '/risks-global', element: GlobalRiskDashboard },
  { path: '/budget', element: BudgetDashboard },
  { path: '/budget-adjustment', element: BudgetAdjustmentPage },
  { path: '/sprints', element: SprintDashboard },
  { path: '/retrospectives', element: RetrospectivesPage },
  { path: '/maturity-audit', element: MaturityAuditReport },
  { path: '/ai-audit', element: AiAuditReport },
  { path: '/valuation', element: ValuationReport },
  { path: '/invoices', element: InvoicesPage },
  { path: '/messaging', element: MessagingPage },
  { path: '/observability', element: ObservabilityDashboard, permission: 'system_logs' },
  { path: '/monitoring', element: ProductivityMonitoringPage },
  { path: '/gov-data', element: GovDataDashboard },
];
