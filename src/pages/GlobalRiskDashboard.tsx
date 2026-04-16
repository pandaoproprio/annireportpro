import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { getRiskLevel, PROBABILITY_LABELS, IMPACT_LABELS, STATUS_LABELS, CATEGORY_LABELS, RiskFormData } from '@/hooks/useProjectRisks';
import { RiskMatrix } from '@/components/risks/RiskMatrix';
import { RiskFormDialog } from '@/components/risks/RiskFormDialog';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Calendar, CheckCircle, Edit, ExternalLink, Filter, RefreshCw, Shield, ShieldAlert, TrendingUp, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useProjectData } from '@/contexts/ProjectContext';

interface RiskWithProject {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  status: string;
  responsible: string | null;
  due_date: string | null;
  dynamic_score: number | null;
  mitigation_plan: string;
  created_at: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  total: number;
  critical: number;
  high: number;
  active: number;
}

const GlobalRiskDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [risks, setRisks] = useState<RiskWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingRisk, setEditingRisk] = useState<RiskWithProject | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchAllRisks = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all risks
      const { data: risksData, error: risksError } = await supabase
        .from('project_risks' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (risksError) throw risksError;

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name');

      if (projectsError) throw projectsError;

      const projectMap = new Map<string, string>();
      (projectsData || []).forEach((p: any) => projectMap.set(p.id, p.name));

      const allRisks: RiskWithProject[] = ((risksData || []) as any[]).map(r => ({
        ...r,
        project_name: projectMap.get(r.project_id) || 'Projeto desconhecido',
      }));

      setRisks(allRisks);

      // Build project summaries
      const summaryMap = new Map<string, ProjectSummary>();
      for (const r of allRisks) {
        if (!summaryMap.has(r.project_id)) {
          summaryMap.set(r.project_id, {
            id: r.project_id,
            name: r.project_name,
            total: 0,
            critical: 0,
            high: 0,
            active: 0,
          });
        }
        const s = summaryMap.get(r.project_id)!;
        s.total++;
        const level = getRiskLevel(r.probability, r.impact).level;
        if (level === 'Crítico' && r.status !== 'resolvido') s.critical++;
        if (level === 'Alto' && r.status !== 'resolvido') s.high++;
        if (!['resolvido', 'aceito'].includes(r.status)) s.active++;
      }
      setProjects(Array.from(summaryMap.values()).sort((a, b) => b.critical - a.critical || b.high - a.high));
    } catch (err) {
      console.error('Error fetching global risks:', err);
      toast.error('Erro ao carregar riscos globais');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllRisks(); }, [fetchAllRisks]);

  const handleUpdateRisk = async (data: RiskFormData): Promise<boolean | undefined> => {
    if (!editingRisk) return false;
    try {
      const updatePayload: any = {
        title: data.title,
        description: data.description,
        category: data.category,
        probability: data.probability,
        impact: data.impact,
        status: data.status,
        mitigation_plan: data.mitigation_plan,
        contingency_plan: data.contingency_plan,
        responsible: data.responsible || null,
        due_date: data.due_date || null,
        resolved_at: data.status === 'resolvido' ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('project_risks' as any)
        .update(updatePayload)
        .eq('id', editingRisk.id);
      if (error) throw error;
      toast.success('Risco atualizado com sucesso');
      await fetchAllRisks();
      return true;
    } catch (err: any) {
      console.error('Error updating risk:', err);
      toast.error('Erro ao atualizar risco');
      return false;
    }
  };

  const handleQuickStatusChange = async (riskId: string, newStatus: string) => {
    try {
      const updatePayload: any = {
        status: newStatus,
        resolved_at: newStatus === 'resolvido' ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('project_risks' as any)
        .update(updatePayload)
        .eq('id', riskId);
      if (error) throw error;
      toast.success(`Status alterado para "${STATUS_LABELS[newStatus]}"`);
      await fetchAllRisks();
    } catch (err: any) {
      toast.error('Erro ao alterar status');
    }
  };

  const openEditDialog = (risk: RiskWithProject) => {
    setEditingRisk(risk);
    setEditDialogOpen(true);
  };
  if (!isSuperAdmin) return (
    <PageTransition>
      <div className="p-6 text-center text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Acesso restrito a Super Administradores.</p>
      </div>
    </PageTransition>
  );

  const filtered = risks.filter(r => {
    if (filterProject !== 'all' && r.project_id !== filterProject) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    return true;
  });

  const globalSummary = {
    total: risks.length,
    critical: risks.filter(r => getRiskLevel(r.probability, r.impact).level === 'Crítico' && r.status !== 'resolvido').length,
    high: risks.filter(r => getRiskLevel(r.probability, r.impact).level === 'Alto' && r.status !== 'resolvido').length,
    active: risks.filter(r => !['resolvido', 'aceito'].includes(r.status)).length,
    resolved: risks.filter(r => r.status === 'resolvido').length,
    overdue: risks.filter(r => r.due_date && r.status !== 'resolvido' && new Date(r.due_date) < new Date()).length,
    projectCount: projects.length,
  };

  const getBadgeVariant = (level: string) => {
    if (level === 'Crítico') return 'destructive' as const;
    if (level === 'Alto') return 'default' as const;
    return 'secondary' as const;
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              Painel Global de Riscos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visão consolidada de todos os projetos</p>
          </div>
          <Button onClick={fetchAllRisks} variant="outline" className="gap-2" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </Button>
        </div>

        {/* Global Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{globalSummary.critical}</p>
                <p className="text-xs text-muted-foreground">Críticos</p>
              </CardContent>
            </Card>
            <Card className="border-orange-500/30 bg-orange-50 dark:bg-orange-500/5">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{globalSummary.high}</p>
                <p className="text-xs text-muted-foreground">Altos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{globalSummary.active}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-50 dark:bg-green-500/5">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{globalSummary.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{globalSummary.overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{globalSummary.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{globalSummary.projectCount}</p>
                <p className="text-xs text-muted-foreground">Projetos</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="by-project">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="by-project">Por Projeto</TabsTrigger>
            <TabsTrigger value="all-risks">Todos os Riscos</TabsTrigger>
            <TabsTrigger value="matrix">Matriz Global</TabsTrigger>
          </TabsList>

          {/* ── TAB: Por Projeto ── */}
          <TabsContent value="by-project" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
              </div>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum risco registrado em nenhum projeto.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {projects.map(proj => {
                  const healthScore = Math.max(0, 100 - (proj.critical * 20) - (proj.high * 10) - (proj.active * 2));
                  return (
                    <Card key={proj.id} className={proj.critical > 0 ? 'border-destructive/30' : ''}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-2">{proj.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Progress value={healthScore} className="h-2 flex-1 max-w-xs" />
                              <span className={`text-sm font-medium ${healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-orange-500' : 'text-destructive'}`}>
                                {healthScore}%
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap shrink-0">
                            {proj.critical > 0 && (
                              <Badge variant="destructive">{proj.critical} Crítico{proj.critical > 1 ? 's' : ''}</Badge>
                            )}
                            {proj.high > 0 && (
                              <Badge variant="default">{proj.high} Alto{proj.high > 1 ? 's' : ''}</Badge>
                            )}
                            <Badge variant="secondary">{proj.active} Ativo{proj.active > 1 ? 's' : ''}</Badge>
                            <Badge variant="outline">{proj.total} Total</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Todos os Riscos ── */}
          <TabsContent value="all-risks" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-auto">{filtered.length} risco(s)</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum risco encontrado com os filtros atuais.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(risk => {
                  const rl = getRiskLevel(risk.probability, risk.impact);
                  const isOverdue = risk.due_date && new Date(risk.due_date) < new Date() && risk.status !== 'resolvido';
                  return (
                    <Card key={risk.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive/40' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-base truncate">{risk.title}</h3>
                              <Badge variant={getBadgeVariant(rl.level)}>{rl.level} ({rl.score})</Badge>
                              <Badge variant="outline">{STATUS_LABELS[risk.status] || risk.status}</Badge>
                              <Badge variant="secondary">{CATEGORY_LABELS[risk.category] || risk.category}</Badge>
                              {isOverdue && <Badge variant="destructive">Atrasado</Badge>}
                            </div>
                            <p className="text-xs text-primary/80 font-medium mb-1">📁 {risk.project_name}</p>
                            {risk.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{risk.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <span>Prob: {PROBABILITY_LABELS[risk.probability]}</span>
                              <span>Impacto: {IMPACT_LABELS[risk.impact]}</span>
                              {risk.responsible && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {risk.responsible}
                                </span>
                              )}
                              {risk.due_date && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                                  <Calendar className="w-3 h-3" /> {format(new Date(risk.due_date), 'dd/MM/yyyy')}
                                </span>
                              )}
                              {risk.dynamic_score != null && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> Score dinâmico: {risk.dynamic_score}
                                </span>
                              )}
                            </div>
                            {risk.mitigation_plan && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                🛡️ Mitigação: {risk.mitigation_plan.substring(0, 120)}{risk.mitigation_plan.length > 120 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditDialog(risk)}>
                                    <Edit className="w-3 h-3" /> Editar
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar risco completo</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {risk.status !== 'resolvido' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => handleQuickStatusChange(risk.id, 'mitigando')}>
                                      <ShieldAlert className="w-3 h-3" /> Mitigar
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Marcar como "Mitigando"</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {risk.status !== 'resolvido' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="gap-1 text-xs text-green-600" onClick={() => handleQuickStatusChange(risk.id, 'resolvido')}>
                                      <CheckCircle className="w-3 h-3" /> Resolver
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Marcar como "Resolvido"</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Matriz Global ── */}
          <TabsContent value="matrix" className="mt-4">
            {risks.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Matriz de Riscos — Todos os Projetos</CardTitle>
                </CardHeader>
                <CardContent>
                  <RiskMatrix risks={risks as any} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum risco para exibir na matriz.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Risk Dialog */}
        <RiskFormDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingRisk(null);
          }}
          onSubmit={handleUpdateRisk}
          initialData={editingRisk ? {
            title: editingRisk.title,
            description: editingRisk.description,
            category: editingRisk.category,
            probability: editingRisk.probability,
            impact: editingRisk.impact,
            status: editingRisk.status,
            mitigation_plan: editingRisk.mitigation_plan || '',
            contingency_plan: (editingRisk as any).contingency_plan || '',
            responsible: editingRisk.responsible || '',
            due_date: editingRisk.due_date || '',
          } : undefined}
          isEdit
        />
      </div>
    </PageTransition>
  );
};

export default GlobalRiskDashboard;
