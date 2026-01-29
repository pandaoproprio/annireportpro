import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useActivities } from '@/hooks/useActivities';
import { SidebarLink } from '@/components/SidebarLink';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { Onboarding } from '@/pages/Onboarding';
import { ActivityManager } from '@/pages/ActivityManager';
import { ReportGenerator } from '@/pages/ReportGenerator';
import { TeamReportGenerator } from '@/pages/TeamReportGenerator';
import { Settings } from '@/pages/Settings';
import { UserManagement } from '@/pages/UserManagement';
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
  Menu, LogOut, PlusCircle, Folder, BarChart3, X, Users, Loader2, Crown 
} from 'lucide-react';


const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, profile, role } = useAuth();
  const { projects, activeProjectId, activeProject, switchProject, isLoading: projectsLoading } = useProjects();
  const { activities, allActivities } = useActivities(activeProjectId);
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

  // Redirect to setup if no projects
  useEffect(() => {
    if (!projectsLoading && projects.length === 0) {
      navigate('/setup');
    }
  }, [projectsLoading, projects.length, navigate]);

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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-sidebar-primary text-lg">AnnIReport</h1>
                  <p className="text-[9px] text-sidebar-foreground/70 leading-tight">Dados confiáveis para decisões<br/>que transformam realidades</p>
                </div>
              </Link>
              <button 
                className="lg:hidden text-sidebar-foreground p-1"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="p-4 border-b border-sidebar-border">
              <Select value={activeProjectId || ''} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground">
                  <Folder className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  <SelectItem value="new" className="text-primary">
                    <span className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" /> Novo Projeto
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
            <SidebarLink to="/activities" icon={<FileEdit className="w-5 h-5" />} label="Diário de Bordo" />
            <SidebarLink to="/report" icon={<FileText className="w-5 h-5" />} label="Relatório do Objeto" />
            <SidebarLink to="/team-report" icon={<Users className="w-5 h-5" />} label="Relatório da Equipe" />
            <SidebarLink to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Configurações" />
            {role === 'SUPER_ADMIN' && (
              <SidebarLink to="/users" icon={<Crown className="w-5 h-5" />} label="Gestão de Usuários" />
            )}
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
                  <p className="text-[10px] text-sidebar-foreground/70 uppercase">{role}</p>
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
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="font-bold">AnnIReport</span>
          </div>
          <div className="w-10" /> {/* Spacer for balance */}
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
          </Routes>
        </div>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-4 px-6 text-center text-sm text-muted-foreground">
          <p className="mb-1">
            <span className="font-semibold text-foreground">AnnIReport</span> © 2026 — Desenvolvido por <span className="font-medium">AnnITech</span> | IT Solutions
          </p>
          <p className="text-xs space-x-2">
            <a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition-colors">Suporte</a>
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
