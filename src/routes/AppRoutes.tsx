import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { SidebarLink } from '@/components/SidebarLink';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { ResetPassword } from '@/pages/ResetPassword';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfUse } from '@/pages/TermsOfUse';
import { DiaryLogin } from '@/pages/DiaryLogin';
import { DiaryLayout } from '@/pages/DiaryLayout';
import { Onboarding } from '@/pages/Onboarding';
import { ActivityManager } from '@/pages/ActivityManager';
import { ReportGenerator } from '@/pages/ReportGenerator';
import { TeamReportGenerator } from '@/pages/TeamReportGenerator';
import { Settings } from '@/pages/Settings';
import { UserManagement } from '@/pages/UserManagement';
import { TeamManagement } from '@/pages/TeamManagement';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  LayoutDashboard, FileEdit, FileText, Settings as SettingsIcon, 
  Menu, LogOut, PlusCircle, Folder, BarChart3, X, Users, Loader2, Crown, UsersRound 
} from 'lucide-react';
import logoGira from '@/assets/logo-gira-relatorios.png';


const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, profile, role } = useAuth();
  const { projects, activeProjectId, activeProject, switchProject, isLoadingProjects: projectsLoading } = useAppData();
  const navigate = useNavigate();

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
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
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Visão Geral</p>
              <div className="space-y-0.5">
                <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
              </div>
            </div>

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
                      <SelectItem value="new" className="text-sidebar-primary font-medium">
                        <span className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4" /> Novo Projeto
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Gestão */}
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Gestão</p>
              <div className="space-y-0.5">
                <SidebarLink to="/activities" icon={<FileEdit className="w-5 h-5" />} label="Diário de Bordo" />
                <SidebarLink to="/report" icon={<FileText className="w-5 h-5" />} label="Relatório do Objeto" />
                <SidebarLink to="/team-report" icon={<Users className="w-5 h-5" />} label="Relatório da Equipe" />
                <SidebarLink to="/team" icon={<UsersRound className="w-5 h-5" />} label="Gestão de Equipes" />
              </div>
            </div>

            {/* Administração */}
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administração</p>
              <div className="space-y-0.5">
                <SidebarLink to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Configurações" />
                {role === 'SUPER_ADMIN' && (
                  <SidebarLink to="/users" icon={<Crown className="w-5 h-5" />} label="Gestão de Usuários" />
                )}
              </div>
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-bold text-sm">
                  {profile?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-primary">{profile?.name || 'Usuário'}</p>
                  <p className="text-xs text-sidebar-foreground/70 uppercase tracking-wide">{role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'OFICINEIRO' ? 'Oficineiro' : role}</p>
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
            
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
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
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/activities" element={<ActivityManager />} />
            <Route path="/report" element={<ReportGenerator />} />
            <Route path="/team-report" element={<TeamReportGenerator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/team" element={<TeamManagement />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-4 px-6 text-center text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">GIRA Relatórios</span> © 2026 — powered by <span className="font-medium">AnnIReport</span> | AnnITech
          </p>
        </footer>
      </main>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/lgpd" element={<PrivacyPolicy />} />
      <Route path="/licenca" element={<TermsOfUse />} />
      <Route path="/diario/login" element={<DiaryLogin />} />
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
  );
};
