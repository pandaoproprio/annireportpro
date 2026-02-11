import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { ActivityManager } from '@/pages/ActivityManager';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FileEdit, LogOut, Folder, Loader2 } from 'lucide-react';
import logoGira from '@/assets/logo-gira.png';

export const DiaryLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const { projects, activeProjectId, activeProject, switchProject, isLoadingProjects } = useAppData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/diario/login');
  };

  if (isLoadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      {/* Breadcrumb */}
      <div className="bg-accent/50 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">GIRA</span>
            <span className="mx-1.5">›</span>
            <span>Diário de Bordo</span>
            <span className="mx-1.5">›</span>
            <span>Projeto</span>
            <span className="mx-1.5">›</span>
            <span className="font-semibold text-foreground">{activeProject?.name}</span>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Bem-vindo ao Diário de Bordo, {profile?.name || 'Usuário'}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aqui você registra as atividades realizadas e acompanha o progresso do seu trabalho.
          </p>
        </div>
        <ActivityManager />
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
