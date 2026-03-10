import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { ActivityManager } from '@/pages/ActivityManager';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FileEdit, LogOut, Folder, Loader2, Receipt, MessageSquare } from 'lucide-react';
import logoGira from '@/assets/logo-gira.png';

const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'));
const MessagingPage = lazy(() => import('@/pages/MessagingPage'));

const PageFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export const DiaryLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const { projects, activeProjectId, activeProject, switchProject, isLoadingProjects } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/diario/login');
  };

  if (isLoadingProjects) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <FileEdit className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sem projetos atribuídos</h2>
          <p className="text-muted-foreground text-sm">
            Você ainda não foi adicionado como colaborador em nenhum projeto. Entre em contato com o administrador.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { path: '/diario', label: 'Atividades', icon: <FileEdit className="w-4 h-4" /> },
    { path: '/diario/notas-fiscais', label: 'Notas Fiscais', icon: <Receipt className="w-4 h-4" /> },
    { path: '/diario/mensagens', label: 'Mensagens', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const currentTab = location.pathname;

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
       <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded">
              <img src={logoGira} alt="GIRA" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold text-foreground hidden sm:block">Diário de Bordo</span>
          </div>

          {projects.length > 1 && (
            <Select value={activeProjectId || ''} onValueChange={switchProject}>
              <SelectTrigger className="w-48">
                <Folder className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.name}
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const isActive = tab.path === '/diario'
              ? currentTab === '/diario' || currentTab === '/diario/'
              : currentTab.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 overflow-y-auto">
        <PwaInstallBanner />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={
              <>
                <div className="mb-6">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    Bem-vindo ao Diário de Bordo, {profile?.name || 'Usuário'}! 👋
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aqui você registra as atividades realizadas e acompanha o progresso do seu trabalho.
                  </p>
                </div>
                <ActivityManager />
              </>
            } />
            <Route path="/notas-fiscais" element={<InvoicesPage />} />
            <Route path="/mensagens" element={<MessagingPage />} />
          </Routes>
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 px-6 text-center text-sm text-muted-foreground space-y-2">
        <p className="text-xs">
          💡 Cada atividade registrada contribui para demonstrar o impacto do projeto.
        </p>
        <p>
          © 2026 AnnITech — Sistema GIRA Diário de Bordo
        </p>
      </footer>
    </div>
  );
};
