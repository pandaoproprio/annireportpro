import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppData } from '@/contexts/AppDataContext';
import { SidebarLink } from '@/components/SidebarLink';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NotificationBell } from '@/components/NotificationBell';
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
  ListChecks, Receipt, MessageSquare, Shield, FileSpreadsheet, FileCheck,
  Activity,
} from 'lucide-react';
import logoGira from '@/assets/logo-gira-relatorios.png';
import { sidebarSections, type SidebarItem as SidebarItemType } from '@/routes/sidebarConfig';
import { shouldShowSidebarItem } from '@/routes/sidebarVisibility';

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, FileEdit, FileText, Settings: SettingsIcon,
  BarChart3, Users, Crown, UsersRound, ScrollText, Layers,
  FileCode2, PenTool, ClipboardList, CalendarDays, Bot,
  ShieldCheck, Brain, TrendingUp, ShieldAlert, DollarSign,
  Zap, ListChecks, Receipt, MessageSquare, Shield, FileSpreadsheet, FileCheck,
  Activity,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProjectChange: (projectId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onLogout, onProjectChange }) => {
  const { profile, role } = useAuth();
  const { hasPermission, isAdmin, permissions } = usePermissions();
  const { projects, activeProjectId } = useAppData();
  const isPrivileged = isAdmin || role === 'SUPER_ADMIN' || role === 'ADMIN';

  const shouldShowItem = (item: SidebarItemType): boolean => {
    return shouldShowSidebarItem(item, {
      role,
      isAdmin: isPrivileged,
      permissions,
      hasPermission,
    });
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-5 h-5" aria-hidden="true" />;
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
      role="navigation"
      aria-label="Menu principal"
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
          {/* Render first section (Visão Geral) */}
          {sidebarSections.filter(s => s.title === 'Visão Geral').map(section => {
            if (section.permission && !hasPermission(section.permission)) return null;
            const visibleItems = section.items.filter(shouldShowItem);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">{section.title}</p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => (
                    <SidebarLink
                      key={item.to}
                      to={item.to}
                      icon={renderIcon(item.iconName)}
                      label={item.to === '/' && (role === 'OFICINEIRO' || role === 'VOLUNTARIO') ? 'Meu Resumo' : item.label}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </div>
            );
          })}

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

          {/* Remaining sections driven by config */}
          {sidebarSections.filter(s => s.title !== 'Visão Geral').map(section => {
            const allItems = section.items;
            const filteredItems = allItems.filter(shouldShowItem);
            if (section.title === 'Gestão') {
              console.log('[Sidebar Debug] Gestão items total:', allItems.length, 'visible:', filteredItems.length);
              allItems.forEach(item => {
                const visible = shouldShowItem(item);
                if (!visible) console.log('[Sidebar Debug] HIDDEN:', item.label, item.to, 'permission:', item.permission, 'adminOnly:', item.adminOnly);
              });
              console.log('[Sidebar Debug] role:', role, 'isAdmin:', isAdmin, 'isPrivileged:', isPrivileged);
            }
            if (section.adminOnly && !isAdmin) return null;
            if (section.permission && !hasPermission(section.permission)) return null;

            const visibleItems = section.items.filter(shouldShowItem);
            if (visibleItems.length === 0) return null;

            // Administração section: only show if user has at least one permission
            if (section.title === 'Administração') {
              const hasAny = section.items.some(item => {
                if (item.adminOnly) return isAdmin;
                if (item.permission) return hasPermission(item.permission);
                return true;
              });
              if (!hasAny) return null;
            }

            return (
              <div key={section.title}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">{section.title}</p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => (
                    <SidebarLink
                      key={item.to}
                      to={item.to}
                      icon={renderIcon(item.iconName)}
                      label={item.label}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
