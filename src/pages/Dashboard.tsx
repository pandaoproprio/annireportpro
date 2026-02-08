import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus, PlusCircle, ArrowRight, Loader2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const { activeProject: project, projects, isLoadingProjects: projectsLoading, activities, isLoadingActivities: activitiesLoading } = useAppData();

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Empty Project State (Admins Only)
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] animate-fadeIn text-center">
        <Card className="max-w-lg shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao AnnIReport</h2>
            <p className="text-muted-foreground mb-6">
              Nenhum projeto foi configurado ainda. Crie seu primeiro projeto para começar.
            </p>
            <Link to="/setup">
              <Button className="w-full sm:w-auto">
                <PlusCircle className="w-4 h-4 mr-2" />
                Configurar Novo Projeto
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'Atividades Totais', value: activities.length, color: 'text-info' },
    { label: 'Pessoas Impactadas', value: activities.reduce((acc, curr) => acc + (curr.attendeesCount || 0), 0), color: 'text-success' },
    { label: 'Metas Ativas', value: project.goals.length, color: 'text-brand-600' },
    { label: 'Dias Restantes', value: project.endDate ? Math.max(0, Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '-', color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Visão Geral: {project.name}</h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} label={stat.label} value={stat.value} colorClass={stat.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Progress */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Progresso das Metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.goals.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada.</p>
              ) : (
                project.goals.map(goal => {
                  const count = activities.filter(a => a.goalId === goal.id).length;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate mr-2">{goal.title}</span>
                        <span className="font-medium text-primary whitespace-nowrap">{count} atividades</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(100, count * 10)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma atividade registrada neste projeto.</p>
            ) : (
              <ul className="space-y-3">
                {activities.slice(0, 5).map(act => (
                  <li key={act.id} className="text-sm border-l-2 border-brand-300 pl-3 py-1 hover:bg-muted/50 transition-colors rounded-r">
                    <span className="text-muted-foreground text-xs block">{new Date(act.date).toLocaleDateString('pt-BR')}</span>
                    <span className="text-foreground">{act.description.substring(0, 60)}...</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link to="/activities" className="text-primary text-sm font-medium hover:underline flex items-center group">
                Ver diário completo 
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
