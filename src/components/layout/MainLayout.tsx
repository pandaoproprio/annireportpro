import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AiChatBot } from '@/components/AiChatBot';
import { SlaLoginToast } from '@/components/sla/SlaLoginToast';
import { NotificationBell } from '@/components/NotificationBell';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { protectedRoutes } from '@/routes/routeConfig';
import logoGira from '@/assets/logo-gira-relatorios.png';

const PageFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const { isLoadingProjects: projectsLoading, switchProject } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        onProjectChange={handleProjectChange}
      />

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
          <NotificationBell />
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-safe">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {protectedRoutes.map(({ path, element: Element, permission }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      permission ? (
                        <PermissionGuard permission={permission as any}>
                          <Element />
                        </PermissionGuard>
                      ) : (
                        <Element />
                      )
                    }
                  />
                ))}
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
      <SlaLoginToast />
    </div>
  );
};
