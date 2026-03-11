import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppData } from '@/contexts/AppDataContext';
import { SidebarLink } from '@/components/SidebarLink';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard, FileEdit, FileText, Settings as SettingsIcon,
  LogOut, PlusCircle, Folder, BarChart3, X, Users, Crown, UsersRound,
  ScrollText, Layers, FileCode2, PenTool, ClipboardList, CalendarDays,
  Bot, ShieldCheck, Brain, TrendingUp, ShieldAlert, DollarSign, Zap,
  ListChecks, Receipt, MessageSquare,
} from 'lucide-react';
import logoGira from '@/assets/logo-gira-relatorios.png';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProjectChange: (projectId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onLogout, onProjectChange }) => {
  const { profile, role } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const { projects, activeProjectId } = useAppData();

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-[80px] overflow-hidden border-b border-sidebar-border bg-white">
          <div className="flex items-center justify-between h-full px-4">
            <Link to="/" className="flex items-center justify-center flex-1 overflow-hidden">
              <img src={logoGira} alt="GIRA Relatórios" className="h-48 max-w-none" />
            </Link>
            <button
              className="lg:hidden text-sidebar-foreground p-1 flex-shrink-0"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-auto">
          {/* Visão Geral */}
          {hasPermission('dashboard') && (
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Visão Geral</p>
              <div className="space-y-0.5">
                <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label={role === 'OFICINEIRO' ? 'Meu Resumo' : 'Dashboard'} onClick={onClose} />
              </div>
            </div>
          )}

          {/* Projetos */}
          {projects.length > 0 && (
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Projetos</p>
              <div className="px-1">
                <Select value={activeProjectId || ''} onValueChange={onProjectChange}>
                  <SelectTrigger className="w-full bg-white border-2 border-sidebar-primary/30 text-sidebar-foreground font-medium shadow-sm hover:border-sidebar-primary/50 transition-colors">
                    <Folder className="w-4 h-4 mr-2 text-sidebar-primary" />
                    <SelectValue placeholder="Selecionar projeto" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                    {hasPermission('project_create') && (
                      <SelectItem value="new" className="text-sidebar-primary font-medium">
                        <span className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4" /> Novo Projeto
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Gestão */}
          <div>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Gestão</p>
            <div className="space-y-0.5">
              {hasPermission('diary') && <SidebarLink to="/activities" icon={<FileEdit className="w-5 h-5" />} label="Diário de Bordo" onClick={onClose} />}
              {hasPermission('report_object') && <SidebarLink to="/report" icon={<FileText className="w-5 h-5" />} label="Relatório do Objeto" onClick={onClose} />}
              {hasPermission('report_team') && <SidebarLink to="/team-report" icon={<Users className="w-5 h-5" />} label="Relatório da Equipe" onClick={onClose} />}
              {hasPermission('report_team') && <SidebarLink to="/justificativa" icon={<FileText className="w-5 h-5" />} label="Justificativa Prorrogação" onClick={onClose} />}
              {hasPermission('report_object') && <SidebarLink to="/report-v2" icon={<BarChart3 className="w-5 h-5" />} label="Relatório V2" onClick={onClose} />}
              {hasPermission('team_management') && <SidebarLink to="/team" icon={<UsersRound className="w-5 h-5" />} label="Gestão de Equipes" onClick={onClose} />}
              {hasPermission('forms_view') && <SidebarLink to="/forms" icon={<ClipboardList className="w-5 h-5" />} label="GIRA Forms" onClick={onClose} />}
              {hasPermission('events_view') && <SidebarLink to="/eventos" icon={<CalendarDays className="w-5 h-5" />} label="GIRA Eventos" onClick={onClose} />}
              <SidebarLink to="/invoices" icon={<Receipt className="w-5 h-5" />} label="Notas Fiscais" onClick={onClose} />
              <SidebarLink to="/messaging" icon={<MessageSquare className="w-5 h-5" />} label="Mensagens" onClick={onClose} />
            </div>
          </div>

          {/* Templates */}
          {isAdmin && (
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Templates</p>
              <div className="space-y-0.5">
                <SidebarLink to="/templates" icon={<Layers className="w-5 h-5" />} label="Templates de Relatórios" onClick={onClose} />
                <SidebarLink to="/editor" icon={<FileCode2 className="w-5 h-5" />} label="Editor de Documentos" onClick={onClose} />
                <SidebarLink to="/wysiwyg" icon={<PenTool className="w-5 h-5" />} label="Editor WYSIWYG" onClick={onClose} />
              </div>
            </div>
          )}

          {/* Estratégico */}
          {isAdmin && (
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Estratégico</p>
              <div className="space-y-0.5">
                <SidebarLink to="/risks" icon={<ShieldAlert className="w-5 h-5" />} label="Gestão de Riscos" onClick={onClose} />
                <SidebarLink to="/budget" icon={<DollarSign className="w-5 h-5" />} label="Custos Consolidados" onClick={onClose} />
                <SidebarLink to="/sprints" icon={<Zap className="w-5 h-5" />} label="Sprints & Velocity" onClick={onClose} />
                <SidebarLink to="/retrospectives" icon={<ListChecks className="w-5 h-5" />} label="Retrospectivas" onClick={onClose} />
                <SidebarLink to="/maturity-audit" icon={<ShieldCheck className="w-5 h-5" />} label="Auditoria de Maturidade" onClick={onClose} />
                <SidebarLink to="/ai-audit" icon={<Brain className="w-5 h-5" />} label="Auditoria de IA" onClick={onClose} />
                <SidebarLink to="/valuation" icon={<TrendingUp className="w-5 h-5" />} label="Valuation Report" onClick={onClose} />
              </div>
            </div>
          )}

          {/* Administração */}
          {(hasPermission('settings_edit') || hasPermission('user_management') || hasPermission('system_logs')) && (
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administração</p>
              <div className="space-y-0.5">
                {hasPermission('settings_edit') && (
                  <SidebarLink to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Configurações" onClick={onClose} />
                )}
                {hasPermission('user_management') && (
                  <SidebarLink to="/users" icon={<Crown className="w-5 h-5" />} label="Gestão de Usuários" onClick={onClose} />
                )}
                {hasPermission('system_logs') && (
                  <SidebarLink to="/logs" icon={<ScrollText className="w-5 h-5" />} label="Logs do Sistema" onClick={onClose} />
                )}
                {isAdmin && (
                  <SidebarLink to="/automato" icon={<Bot className="w-5 h-5" />} label="Automato" onClick={onClose} />
                )}
              </div>
            </div>
          )}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-bold text-sm">
                {profile?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-sidebar-primary">{profile?.name || 'Usuário'}</p>
                <p className="text-xs text-sidebar-foreground/70 uppercase tracking-wide">
                  {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : role === 'ANALISTA' ? 'Analista' : 'Usuário'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <button
                onClick={onLogout}
                className="text-sidebar-foreground/70 hover:text-sidebar-primary p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <InstallPrompt />
        </div>
      </div>
    </aside>
  );
};
