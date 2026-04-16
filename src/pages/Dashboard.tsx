import React, { useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectData } from '@/contexts/ProjectContext';
import { useActivityData } from '@/contexts/ActivityContext';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderPlus, PlusCircle, ArrowRight, Loader2, FileEdit, Target, BarChart3, Download } from 'lucide-react';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { StatCardSkeleton, CardSkeleton } from '@/components/ui/content-skeleton';
import { ActivitiesByMonthChart } from '@/components/dashboard/ActivitiesByMonthChart';
import { ActivityTypesChart } from '@/components/dashboard/ActivityTypesChart';
import { AttendeesByGoalChart } from '@/components/dashboard/AttendeesByGoalChart';
import { PendingActivitiesBanner } from '@/components/PendingActivitiesBanner';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { CrossProjectChart } from '@/components/dashboard/CrossProjectChart';
import PredictiveAnalysisDashboard from '@/components/dashboard/PredictiveAnalysisDashboard';
import BenchmarkingDashboard from '@/components/dashboard/BenchmarkingDashboard';
import { useSlaTracking } from '@/hooks/useSlaTracking';
import { SlaDashboardCards } from '@/components/sla/SlaDashboardCards';
import { SlaOverdueBanner } from '@/components/sla/SlaOverdueBanner';
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard';
import { WipAlertBanner } from '@/components/performance/WipAlertBanner';
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';
import { AiExecutiveSummary } from '@/components/dashboard/AiExecutiveSummary';
import { ProactiveSummaryCard } from '@/components/dashboard/ProactiveSummaryCard';
import { exportDashboardToPdf } from '@/lib/dashboardPdfExport';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { format, parseISO, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-64" />
    <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <StaggerItem key={i}><StatCardSkeleton /></StaggerItem>
      ))}
    </StaggerContainer>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <FadeIn key={i} delay={0.2 + i * 0.1}><CardSkeleton /></FadeIn>
      ))}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const { hasPermission } = usePermissions();
  const { activeProject: project, projects, isLoadingProjects: projectsLoading } = useProjectData();
  const { activities, isLoadingActivities: activitiesLoading } = useActivityData();
  const canCreateProject = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isAdminUser = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const { getSummary, getOverdueTrackings, refreshStatuses } = useSlaTracking(project?.id);
  const slaSummary = getSummary();
  const overdueItems = getOverdueTrackings();
  const { wipCount, wipLimit, wipDrafts } = usePerformanceTracking(project?.id);
  const { data: globalStats, isLoading: globalLoading } = useGlobalStats(isSuperAdmin);

  // Refresh SLA statuses on mount
  React.useEffect(() => {
    if (project?.id) refreshStatuses.mutate();
  }, [project?.id]);

  // Redirect users without dashboard permission to their default page
  if (!hasPermission('dashboard')) {
    return <Navigate to="/activities" replace />;
  }

  if (projectsLoading || (isSuperAdmin && globalLoading)) {
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

  const stats = isSuperAdmin && globalStats
    ? [
        { label: 'Projetos', value: globalStats.totalProjects, color: 'text-brand-600' },
        { label: 'Atividades Totais', value: globalStats.totalActivities, color: 'text-info' },
        { label: 'Pessoas Impactadas', value: globalStats.totalAttendees, color: 'text-success' },
        { label: 'Metas Ativas', value: globalStats.totalGoals, color: 'text-warning' },
      ]
    : [
        { label: 'Atividades Totais', value: activities.length, color: 'text-info' },
        { label: 'Pessoas Impactadas', value: activities.reduce((acc, curr) => acc + (curr.attendeesCount || 0), 0), color: 'text-success' },
        { label: 'Metas Ativas', value: project.goals.length, color: 'text-brand-600' },
        { label: 'Dias Restantes', value: project.endDate ? Math.max(0, Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '-', color: 'text-warning' },
      ];

  return (
    <PageTransition className="space-y-6">
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
          <span className="text-sm text-muted-foreground">
            {isSuperAdmin ? 'Visão Global — Todos os Projetos' : 'Painel de Controle Total'}
          </span>
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-muted text-foreground rounded-full border border-border">
            {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : role === 'ANALISTA' ? 'Analista' : 'Usuário'}
          </span>
        </div>
      </div>

      {isAdminUser ? (
        <Tabs defaultValue="painel" className="w-full">
          <TabsList>
            <TabsTrigger value="painel">Painel</TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Performance
            </TabsTrigger>
          </TabsList>
          <TabsContent value="painel">
            {isSuperAdmin && globalStats ? (
              <SuperAdminPanelContent
                stats={stats}
                globalStats={globalStats}
                projects={projects}
                role={role}
              />
            ) : (
              <DashboardPanelContent
                stats={stats}
                slaSummary={slaSummary}
                activities={activities}
                project={project}
                activitiesLoading={activitiesLoading}
                role={role}
                showAiSummary={true}
              />
            )}
          </TabsContent>
          <TabsContent value="analytics">
            <div className="space-y-6 mt-4">
              {project && (
                <PredictiveAnalysisDashboard
                  activities={activities}
                  projectEndDate={project.endDate}
                  projectStartDate={project.startDate}
                  projectName={isSuperAdmin ? 'Todos os Projetos' : project.name}
                />
              )}
              <ActivityHeatmap activities={activities} />
              {projects.length >= 2 && (
                <CrossProjectChart
                  projects={projects}
                  activitiesByProject={{ [project.id]: activities }}
                />
              )}
              <BenchmarkingDashboard />
            </div>
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
    </PageTransition>
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
  showAiSummary?: boolean;
}

const DashboardPanelContent: React.FC<DashboardPanelContentProps> = ({
  stats, slaSummary, activities, project, activitiesLoading, role, showAiSummary,
}) => {
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const activitiesByType = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  const activitiesByGoal = activities.reduce<Record<string, number>>((acc, a) => {
    const goal = project.goals.find((g: any) => g.id === a.goalId);
    if (goal) acc[goal.title] = (acc[goal.title] || 0) + 1;
    return acc;
  }, {});

  const daysRemaining = project.endDate
    ? Math.max(0, Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000))
    : '-';

  const aiProjectData = {
    name: project.name,
    organization: project.organizationName,
    fomento: project.fomentoNumber,
    funder: project.funder,
    startDate: project.startDate,
    endDate: project.endDate,
    daysRemaining,
    totalActivities: activities.length,
    totalAttendees: activities.reduce((a: number, c: any) => a + (c.attendeesCount || 0), 0),
    goalsCount: project.goals.length,
    activitiesByType,
    activitiesByGoal,
    locations: project.locations || [],
    slaOnTime: 0,
    slaOverdue: 0,
    draftsCount: activities.filter((a: any) => a.isDraft).length,
  };

  const activitiesByMonth: Record<string, number> = {};
  if (activities.length > 0) {
    const start = project.startDate ? parseISO(project.startDate) : parseISO(activities[activities.length - 1]?.date);
    const end = project.endDate ? parseISO(project.endDate) : new Date();
    try {
      const months = eachMonthOfInterval({ start: startOfMonth(start), end: startOfMonth(end) });
      months.forEach(month => {
        const key = format(month, 'yyyy-MM');
        const label = format(month, 'MMM/yy', { locale: ptBR });
        const count = activities.filter((a: any) => format(parseISO(a.date), 'yyyy-MM') === key).length;
        activitiesByMonth[label] = count;
      });
    } catch {}
  }

  const handleExportPdf = () => {
    try {
      exportDashboardToPdf({
        projectName: project.name,
        organization: project.organizationName,
        fomento: project.fomentoNumber,
        funder: project.funder,
        startDate: project.startDate,
        endDate: project.endDate,
        daysRemaining,
        totalActivities: activities.length,
        totalAttendees: activities.reduce((a: number, c: any) => a + (c.attendeesCount || 0), 0),
        goalsCount: project.goals.length,
        activitiesByType,
        activitiesByGoal,
        activitiesByMonth,
        aiNarrative,
        slaOnTime: 0,
        slaOverdue: 0,
        draftsCount: activities.filter((a: any) => a.isDraft).length,
        goals: project.goals.map((g: any) => ({
          title: g.title,
          activityCount: activities.filter((a: any) => a.goalId === g.id).length,
        })),
        recentActivities: activities.slice(0, 10).map((a: any) => ({
          date: new Date(a.date).toLocaleDateString('pt-BR'),
          description: a.description,
        })),
      });
      toast.success('PDF do Dashboard exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar PDF');
    }
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Export + AI Summary */}
      {showAiSummary && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Dashboard PDF
            </Button>
          </div>
          <AiExecutiveSummary projectData={aiProjectData} onNarrativeChange={setAiNarrative} />
        </div>
      )}

      {/* Proactive AI Summary - always visible when project exists */}
      <ProactiveSummaryCard projectId={project?.id} />

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
};

// ── Super Admin Global Panel ──
import type { GlobalStats } from '@/hooks/useGlobalStats';
import { Users, FolderOpen } from 'lucide-react';

interface SuperAdminPanelContentProps {
  stats: Array<{ label: string; value: string | number; color: string }>;
  globalStats: GlobalStats;
  projects: any[];
  role: string | null;
}

const SuperAdminPanelContent: React.FC<SuperAdminPanelContentProps> = ({
  stats, globalStats, projects,
}) => {
  const sortedProjects = Object.values(globalStats.activitiesByProject)
    .sort((a, b) => b.count - a.count);

  // Build chart data for types
  const typeEntries = Object.entries(globalStats.activitiesByType).sort((a, b) => b[1] - a[1]);

  // Build monthly sorted
  const monthEntries = Object.entries(globalStats.activitiesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);

  return (
    <div className="space-y-6 mt-4">
      {/* Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} label={stat.label} value={stat.value} colorClass={stat.color} />
        ))}
      </div>

      {/* Projects Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Atividades por Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedProjects.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum dado disponível</p>
          ) : (
            <div className="space-y-3">
              {sortedProjects.map((p, i) => {
                const maxCount = sortedProjects[0]?.count || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate mr-2 font-medium">{p.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {p.count} ativ. · {p.attendees.toLocaleString('pt-BR')} pessoas
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(4, (p.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {typeEntries.map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{type}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities (global) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividades Recentes (Global)</CardTitle>
          </CardHeader>
          <CardContent>
            {globalStats.recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade registrada.</p>
            ) : (
              <ul className="space-y-3">
                {globalStats.recentActivities.map((act) => (
                  <li key={act.id} className="text-sm border-l-2 border-brand-300 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-muted-foreground text-xs">{new Date(act.date).toLocaleDateString('pt-BR')}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{act.projectName}</span>
                    </div>
                    <span className="text-foreground">{act.description.substring(0, 80)}...</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {monthEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal (Global)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {monthEntries.map(([month, count]) => {
                const maxM = Math.max(...monthEntries.map(([, c]) => c), 1);
                const label = month.substring(5) + '/' + month.substring(2, 4);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">{count}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t transition-all duration-500"
                      style={{ height: `${Math.max(4, (count / maxM) * 100)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary info */}
      <div className="text-sm text-muted-foreground text-center py-2">
        <Users className="w-4 h-4 inline mr-1" />
        {globalStats.totalProjects} projetos · {globalStats.totalActivities} atividades · {globalStats.totalAttendees.toLocaleString('pt-BR')} pessoas impactadas · {globalStats.draftCount} rascunhos
      </div>
    </div>
  );
};
