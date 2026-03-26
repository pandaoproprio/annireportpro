/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  CONFIGURAÇÃO CENTRALIZADA DA SIDEBAR — NÃO REMOVER MÓDULOS!      ║
 * ║                                                                     ║
 * ║  Este arquivo é a FONTE ÚNICA DE VERDADE para os itens do menu.    ║
 * ║  Qualquer módulo listado aqui DEVE aparecer na sidebar.            ║
 * ║                                                                     ║
 * ║  Módulos protegidos contra regressão:                               ║
 * ║    • GIRA Relatórios (core)                                         ║
 * ║    • GIRA Forms                                                     ║
 * ║    • GIRA Eventos                                                   ║
 * ║                                                                     ║
 * ║  ⚠️  NÃO MODIFIQUE sem autorização explícita do proprietário.      ║
 * ║  Rebuild: 2026-03-14                                               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import type { AppPermission } from '@/hooks/usePermissions';

export interface SidebarItem {
  to: string;
  label: string;
  /** lucide-react icon name */
  iconName: string;
  /** If set, item is only shown when hasPermission(permission) is true */
  permission?: AppPermission;
  /** If true, item is only shown for admin users */
  adminOnly?: boolean;
}

export interface SidebarSection {
  title: string;
  /** If set, section is only shown when hasPermission(permission) is true */
  permission?: AppPermission;
  /** If true, section is only shown for admin users */
  adminOnly?: boolean;
  items: SidebarItem[];
}

// ─── CRITICAL MODULES — never remove ───────────────────────────────────
export const CRITICAL_MODULES = [
  { path: '/forms', label: 'GIRA Forms' },
  { path: '/eventos', label: 'GIRA Eventos' },
  { path: '/activities', label: 'Diário de Bordo' },
  { path: '/', label: 'Dashboard' },
] as const;

// ─── Section definitions ───────────────────────────────────────────────

export const sidebarSections: SidebarSection[] = [
  {
    title: 'Visão Geral',
    permission: 'dashboard',
    items: [
      { to: '/', label: 'Dashboard', iconName: 'LayoutDashboard' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { to: '/activities', label: 'Diário de Bordo', iconName: 'FileEdit', permission: 'diary' },
      { to: '/report', label: 'Relatório do Objeto', iconName: 'FileText', permission: 'report_object' },
      { to: '/team-report', label: 'Relatório da Equipe', iconName: 'Users', permission: 'report_team' },
      { to: '/justificativa', label: 'Justificativa Prorrogação', iconName: 'FileText', permission: 'report_team' },
      { to: '/report-v2', label: 'Relatório V2', iconName: 'BarChart3', permission: 'report_object' },
      { to: '/team', label: 'Gestão de Equipes', iconName: 'UsersRound', permission: 'team_management' },
      // ⚠️ GIRA Forms — MÓDULO PROTEGIDO
      { to: '/forms', label: 'GIRA Forms', iconName: 'ClipboardList', permission: 'forms_view' },
      // ⚠️ GIRA Eventos — MÓDULO PROTEGIDO
      { to: '/eventos', label: 'GIRA Eventos', iconName: 'CalendarDays', permission: 'events_view' },
      { to: '/invoices', label: 'Notas Fiscais', iconName: 'Receipt' },
      { to: '/messaging', label: 'Mensagens', iconName: 'MessageSquare' },
    ],
  },
  {
    title: 'Templates',
    adminOnly: true,
    items: [
      { to: '/templates', label: 'Templates de Relatórios', iconName: 'Layers' },
      { to: '/editor', label: 'Editor de Documentos', iconName: 'FileCode2' },
      { to: '/wysiwyg', label: 'Editor WYSIWYG', iconName: 'PenTool' },
    ],
  },
  {
    title: 'Estratégico',
    adminOnly: true,
    items: [
      { to: '/risks', label: 'Gestão de Riscos', iconName: 'ShieldAlert' },
      { to: '/budget', label: 'Custos Consolidados', iconName: 'DollarSign' },
      { to: '/budget-adjustment', label: 'Ajuste de PT/RA', iconName: 'FileSpreadsheet' },
      { to: '/sprints', label: 'Sprints & Velocity', iconName: 'Zap' },
      { to: '/retrospectives', label: 'Retrospectivas', iconName: 'ListChecks' },
      { to: '/maturity-audit', label: 'Auditoria de Maturidade', iconName: 'ShieldCheck' },
      { to: '/ai-audit', label: 'Auditoria de IA', iconName: 'Brain' },
      { to: '/valuation', label: 'Valuation Report', iconName: 'TrendingUp' },
    ],
  },
  {
    title: 'Administração',
    items: [
      { to: '/settings', label: 'Configurações', iconName: 'Settings', permission: 'settings_edit' },
      { to: '/users', label: 'Gestão de Usuários', iconName: 'Crown', permission: 'user_management' },
      { to: '/logs', label: 'Logs do Sistema', iconName: 'ScrollText', permission: 'system_logs' },
      { to: '/automato', label: 'Automato', iconName: 'Bot', adminOnly: true },
    ],
  },
];
