import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppData } from '@/contexts/AppDataContext';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderPlus, PlusCircle, ArrowRight, Loader2, FileEdit, Target, BarChart3 } from 'lucide-react';
import { ActivitiesByMonthChart } from '@/components/dashboard/ActivitiesByMonthChart';
import { ActivityTypesChart } from '@/components/dashboard/ActivityTypesChart';
import { AttendeesByGoalChart } from '@/components/dashboard/AttendeesByGoalChart';
import { PendingActivitiesBanner } from '@/components/PendingActivitiesBanner';
import { useSlaTracking } from '@/hooks/useSlaTracking';
import { SlaDashboardCards } from '@/components/sla/SlaDashboardCards';
import { SlaOverdueBanner } from '@/components/sla/SlaOverdueBanner';
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard';
import { WipAlertBanner } from '@/components/performance/WipAlertBanner';
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fadeIn">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-card p-6 rounded-lg border border-border">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const { hasPermission } = usePermissions();
  const { activeProject: project, projects, isLoadingProjects: projectsLoading, activities, isLoadingActivities: activitiesLoading } = useAppData();
  const canCreateProject = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isAdminUser = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const { getSummary, getOverdueTrackings, refreshStatuses } = useSlaTracking(project?.id);
  const slaSummary = getSummary();
  const overdueItems = getOverdueTrackings();
  const { wipCount, wipLimit, wipDrafts } = usePerformanceTracking(project?.id);

  // Refresh SLA statuses on mount
  React.useEffect(() => {
    if (project?.id) refreshStatuses.mutate();
  }, [project?.id]);

  // Redirect users without dashboard permission to their default page
  if (!hasPermission('dashboard')) {
    return <Navigate to="/activities" replace />;
  }

  if (projectsLoading) {
    return <DashboardSkeleton />;
  }
  
  // Empty Project State
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] animate-fadeIn text-center">
        <Card className="max-w-lg shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Bem-vindo ao GIRA Relatórios</h2>
            <p className="text-muted-foreground mb-6">
              {canCreateProject
                ? 'Nenhum projeto foi configurado ainda. Crie seu primeiro projeto para começar.'
                : 'Nenhum projeto foi vinculado à sua conta. Entre em contato com o administrador.'}
            </p>
            {canCreateProject && (
              <Link to="/setup">
                <Button className="w-full sm:w-auto">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Configurar Novo Projeto
                </Button>
              </Link>
            )}
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
      {/* SLA Overdue Banner */}
      <SlaOverdueBanner overdueItems={overdueItems} />
      {/* WIP Alert Banner */}
      <WipAlertBanner wipCount={wipCount} wipLimit={wipLimit} wipDrafts={wipDrafts} isAdmin={isAdminUser} />
      {/* Pending Activities Reminder */}
      <PendingActivitiesBanner />
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground font-medium">
          <span className="font-bold text-foreground">GIRA</span> <span className="text-muted-foreground">| Relatórios</span>
        </p>
        <h1 className="text-2xl font-display font-bold text-primary">
          Olá, {profile?.name?.split(' ')[0] || 'Usuário'}!
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-muted-foreground">Painel de Controle Total</span>
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-muted text-foreground rounded-full border border-border">
            {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : role === 'ANALISTA' ? 'Analista' : 'Usuário'}
          </span>
        </div>
      </div>

      {isAdminUser ? (
        <Tabs defaultValue="painel" className="w-full">
          <TabsList>
            <TabsTrigger value="painel">Painel</TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Performance
            </TabsTrigger>
          </TabsList>
          <TabsContent value="painel">
            <DashboardPanelContent
              stats={stats}
              slaSummary={slaSummary}
              activities={activities}
              project={project}
              activitiesLoading={activitiesLoading}
              role={role}
            />
          </TabsContent>
          <TabsContent value="performance">
            <PerformanceDashboard projectId={project?.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <DashboardPanelContent
          stats={stats}
          slaSummary={slaSummary}
          activities={activities}
          project={project}
          activitiesLoading={activitiesLoading}
          role={role}
        />
      )}
    </div>
  );
};

// Extracted panel content to keep Dashboard clean
interface DashboardPanelContentProps {
  stats: Array<{ label: string; value: string | number; color: string }>;
  slaSummary: any;
  activities: any[];
  project: any;
  activitiesLoading: boolean;
  role: string | null;
}

const DashboardPanelContent: React.FC<DashboardPanelContentProps> = ({
  stats, slaSummary, activities, project, activitiesLoading, role,
}) => (
  <div className="space-y-6 mt-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={i} label={stat.label} value={stat.value} colorClass={stat.color} />
      ))}
    </div>

    <SlaDashboardCards summary={slaSummary} />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ActivitiesByMonthChart
        activities={activities}
        startDate={project.startDate}
        endDate={project.endDate}
      />
      <ActivityTypesChart activities={activities} />
    </div>

    {activities.length > 0 && project.goals.length > 0 && (
      <AttendeesByGoalChart activities={activities} goals={project.goals} />
    )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Progresso das Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {project.goals.length === 0 ? (
              <div className="text-center py-6">
                <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">Nenhuma meta cadastrada.</p>
                {role !== 'OFICINEIRO' && (
                  <Link to="/settings">
                    <Button variant="outline" size="sm">
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Cadastrar Meta
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              project.goals.map((goal: any) => {
                const count = activities.filter((a: any) => a.goalId === goal.id).length;
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
            <div className="text-center py-6">
              <FileEdit className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-3">Nenhuma atividade registrada neste projeto.</p>
              <Link to="/activities">
                <Button variant="outline" size="sm">
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Registrar Atividade
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {activities.slice(0, 5).map((act: any) => (
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
