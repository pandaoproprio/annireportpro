import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppData } from '@/contexts/AppDataContext';
import { SidebarLink } from '@/components/SidebarLink';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Login } from '@/pages/Login';
import { ResetPassword } from '@/pages/ResetPassword';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfUse } from '@/pages/TermsOfUse';
import { DiaryLogin } from '@/pages/DiaryLogin';
import { InstallPrompt } from '@/components/InstallPrompt';
import { OfflineBadge } from '@/components/OfflineBadge';
import { AiChatBot } from '@/components/AiChatBot';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, FileEdit, FileText, Settings as SettingsIcon, 
  Menu, LogOut, PlusCircle, Folder, BarChart3, X, Users, Loader2, Crown, UsersRound, ScrollText, Layers, FileCode2, PenTool
} from 'lucide-react';
import logoGira from '@/assets/logo-gira-relatorios.png';

// Lazy-loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ActivityManager = lazy(() => import('@/pages/ActivityManager').then(m => ({ default: m.ActivityManager })));
const ReportGenerator = lazy(() => import('@/pages/ReportGenerator').then(m => ({ default: m.ReportGenerator })));
const TeamReportGenerator = lazy(() => import('@/pages/TeamReportGenerator').then(m => ({ default: m.TeamReportGenerator })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const UserManagement = lazy(() => import('@/pages/UserManagement').then(m => ({ default: m.UserManagement })));
const TeamManagement = lazy(() => import('@/pages/TeamManagement').then(m => ({ default: m.TeamManagement })));
const DiaryLayout = lazy(() => import('@/pages/DiaryLayout').then(m => ({ default: m.DiaryLayout })));
const Onboarding = lazy(() => import('@/pages/Onboarding').then(m => ({ default: m.Onboarding })));
const LgpdConsent = lazy(() => import('@/pages/LgpdConsent').then(m => ({ default: m.LgpdConsent })));
const ForcePasswordChange = lazy(() => import('@/pages/ForcePasswordChange').then(m => ({ default: m.ForcePasswordChange })));
const SystemLogs = lazy(() => import('@/pages/SystemLogs').then(m => ({ default: m.SystemLogs })));
const JustificationReportGenerator = lazy(() => import('@/pages/JustificationReportGenerator').then(m => ({ default: m.JustificationReportGenerator })));
const ReportTemplates = lazy(() => import('@/pages/ReportTemplates').then(m => ({ default: m.ReportTemplates })));
const ReportTemplateEditor = lazy(() => import('@/pages/ReportTemplateEditor').then(m => ({ default: m.ReportTemplateEditor })));
const DocumentEditorPage = lazy(() => import('@/pages/DocumentEditorPage'));
const WysiwygEditorPage = lazy(() => import('@/pages/WysiwygEditorPage'));
const ReportV2Page = lazy(() => import('@/modules/reports-v2/ReportV2Page'));

const PageFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);


const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, profile, role } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const { projects, activeProjectId, activeProject, switchProject, isLoadingProjects: projectsLoading } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProjectChange = (projectId: string) => {
    if (projectId === 'new') {
      navigate('/setup');
    } else {
      switchProject(projectId);
    }
  };

  // No automatic redirect to setup — users always land on Dashboard after login

  if (projectsLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-[80px] overflow-hidden border-b border-sidebar-border bg-white">
            <div className="flex items-center justify-between h-full px-4">
              <Link to="/" className="flex items-center justify-center flex-1 overflow-hidden">
                <img src={logoGira} alt="GIRA Relatórios" className="h-48 max-w-none" />
              </Link>
              <button 
                className="lg:hidden text-sidebar-foreground p-1 flex-shrink-0"
                onClick={() => setSidebarOpen(false)}
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
                  <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label={role === 'OFICINEIRO' ? 'Meu Resumo' : 'Dashboard'} onClick={closeSidebar} />
                </div>
              </div>
            )}

            {/* Projetos */}
            {projects.length > 0 && (
              <div>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Projetos</p>
                <div className="px-1">
                  <Select value={activeProjectId || ''} onValueChange={handleProjectChange}>
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
                {hasPermission('diary') && <SidebarLink to="/activities" icon={<FileEdit className="w-5 h-5" />} label="Diário de Bordo" onClick={closeSidebar} />}
                {hasPermission('report_object') && <SidebarLink to="/report" icon={<FileText className="w-5 h-5" />} label="Relatório do Objeto" onClick={closeSidebar} />}
                {hasPermission('report_team') && <SidebarLink to="/team-report" icon={<Users className="w-5 h-5" />} label="Relatório da Equipe" onClick={closeSidebar} />}
                {hasPermission('report_team') && <SidebarLink to="/justificativa" icon={<FileText className="w-5 h-5" />} label="Justificativa Prorrogação" onClick={closeSidebar} />}
                {hasPermission('report_object') && <SidebarLink to="/report-v2" icon={<BarChart3 className="w-5 h-5" />} label="Relatório V2" onClick={closeSidebar} />}
                {hasPermission('team_management') && <SidebarLink to="/team" icon={<UsersRound className="w-5 h-5" />} label="Gestão de Equipes" onClick={closeSidebar} />}
              </div>
            </div>

            {/* Templates */}
            {isAdmin && (
              <div>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Templates</p>
                <div className="space-y-0.5">
                  <SidebarLink to="/templates" icon={<Layers className="w-5 h-5" />} label="Templates de Relatórios" onClick={closeSidebar} />
                  <SidebarLink to="/editor" icon={<FileCode2 className="w-5 h-5" />} label="Editor de Documentos" onClick={closeSidebar} />
                  <SidebarLink to="/wysiwyg" icon={<PenTool className="w-5 h-5" />} label="Editor WYSIWYG" onClick={closeSidebar} />
                </div>
              </div>
            )}

            {/* Administração */}
            {(hasPermission('settings_edit') || hasPermission('user_management') || hasPermission('system_logs')) && (
              <div>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administração</p>
                <div className="space-y-0.5">
                  {hasPermission('settings_edit') && (
                    <SidebarLink to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Configurações" onClick={closeSidebar} />
                  )}
                  {hasPermission('user_management') && (
                    <SidebarLink to="/users" icon={<Crown className="w-5 h-5" />} label="Gestão de Usuários" onClick={closeSidebar} />
                  )}
                  {hasPermission('system_logs') && (
                    <SidebarLink to="/logs" icon={<ScrollText className="w-5 h-5" />} label="Logs do Sistema" onClick={closeSidebar} />
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
              <button 
                onClick={handleLogout}
                className="text-sidebar-foreground/70 hover:text-sidebar-primary p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            <InstallPrompt />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-20">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-foreground p-2 rounded-lg hover:bg-muted"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img src={logoGira} alt="GIRA Relatórios" className="h-8" />
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-safe">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/activities" element={<PermissionGuard permission="diary"><ActivityManager /></PermissionGuard>} />
                <Route path="/report" element={<PermissionGuard permission="report_object"><ReportGenerator /></PermissionGuard>} />
                <Route path="/team-report" element={<PermissionGuard permission="report_team"><TeamReportGenerator /></PermissionGuard>} />
                <Route path="/justificativa" element={<PermissionGuard permission="report_team"><JustificationReportGenerator /></PermissionGuard>} />
                <Route path="/settings" element={<PermissionGuard permission="settings_edit"><Settings /></PermissionGuard>} />
                <Route path="/users" element={<PermissionGuard permission="user_management"><UserManagement /></PermissionGuard>} />
                <Route path="/team" element={<PermissionGuard permission="team_management"><TeamManagement /></PermissionGuard>} />
                <Route path="/templates" element={<ReportTemplates />} />
                <Route path="/templates/:id" element={<ReportTemplateEditor />} />
                <Route path="/logs" element={<PermissionGuard permission="system_logs"><SystemLogs /></PermissionGuard>} />
                <Route path="/editor/:id" element={<DocumentEditorPage />} />
                <Route path="/editor" element={<DocumentEditorPage />} />
                <Route path="/wysiwyg/:id" element={<WysiwygEditorPage />} />
                <Route path="/wysiwyg" element={<WysiwygEditorPage />} />
                <Route path="/report-v2" element={<PermissionGuard permission="report_object"><ReportV2Page /></PermissionGuard>} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-2 sm:py-4 px-4 sm:px-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">GIRA Relatórios</span> © 2026 — powered by <span className="font-medium">AnnIReport</span> | AnnITech
          </p>
        </footer>
      </main>
      <AiChatBot />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/lgpd" element={<PrivacyPolicy />} />
        <Route path="/licenca" element={<TermsOfUse />} />
        <Route path="/diario/login" element={<DiaryLogin />} />
        <Route path="/consentimento" element={
          <ProtectedRoute>
            <LgpdConsent />
          </ProtectedRoute>
        } />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ForcePasswordChange />
          </ProtectedRoute>
        } />
        <Route path="/diario/*" element={
          <ProtectedRoute>
            <DiaryLayout />
          </ProtectedRoute>
        } />
        <Route path="/setup" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
};
