import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectData } from '@/contexts/ProjectContext';
import { useProjectRisks, getRiskLevel, ProjectRisk, RiskFormData, PROBABILITY_LABELS, IMPACT_LABELS, STATUS_LABELS, CATEGORY_LABELS } from '@/hooks/useProjectRisks';
import { useRiskIntelligence } from '@/hooks/useRiskIntelligence';
import { RiskFormDialog } from '@/components/risks/RiskFormDialog';
import { RiskSummaryCards } from '@/components/risks/RiskSummaryCards';
import { RiskMatrix } from '@/components/risks/RiskMatrix';
import { RiskAiPanel } from '@/components/risks/RiskAiPanel';
import { RiskCalendar } from '@/components/risks/RiskCalendar';
import { RiskPredictiveDashboard } from '@/components/risks/RiskPredictiveDashboard';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, ShieldAlert, Calendar, User, Filter, Brain, CalendarDays, Activity } from 'lucide-react';
import { format } from 'date-fns';

const RiskManagement: React.FC = () => {
  const { user } = useAuth();
  const { activeProject: project } = useProjectData();
  const { risks, isLoading, createRisk, updateRisk, deleteRisk, summary } = useProjectRisks(project?.id);
  const intelligence = useRiskIntelligence(project?.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('risks');

  if (!user) return <Navigate to="/login" replace />;
  if (!project) return (
    <PageTransition>
      <div className="p-6 text-center text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Selecione um projeto para gerenciar riscos.</p>
      </div>
    </PageTransition>
  );

  const filtered = risks.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    return true;
  });

  const handleEdit = (risk: ProjectRisk) => {
    setEditingRisk(risk);
    setFormOpen(true);
  };

  const handleSubmit = async (data: RiskFormData) => {
    if (editingRisk) {
      const updates: any = { ...data };
      if (data.status === 'resolvido' && editingRisk.status !== 'resolvido') {
        updates.resolved_at = new Date().toISOString();
      }
      if (data.status !== 'resolvido') {
        updates.resolved_at = null;
      }
      return updateRisk(editingRisk.id, updates);
    }
    return createRisk(data);
  };

  const getBadgeVariant = (level: string) => {
    if (level === 'Crítico') return 'destructive' as const;
    if (level === 'Alto') return 'default' as const;
    return 'secondary' as const;
  };

  const overdueCount = risks.filter(r => r.due_date && r.status !== 'resolvido' && new Date(r.due_date) < new Date()).length;

  return (
    <PageTransition>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              Gestão de Riscos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
          </div>
          <Button onClick={() => { setEditingRisk(null); setFormOpen(true); }} className="gap-2">
            <PlusCircle className="w-4 h-4" /> Novo Risco
          </Button>
        </div>

        <RiskSummaryCards summary={summary} unreadAlerts={intelligence.unreadAlerts} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="risks" className="gap-2">
              <ShieldAlert className="w-4 h-4" /> Riscos
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-2 relative">
              <Activity className="w-4 h-4" /> Inteligência
              {(intelligence.unreadAlerts > 0 || intelligence.suggestions.length > 0) && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {intelligence.unreadAlerts + intelligence.suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Brain className="w-4 h-4" /> Análise IA
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 relative">
              <CalendarDays className="w-4 h-4" /> Calendário
              {overdueCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {overdueCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Riscos ── */}
          <TabsContent value="risks" className="space-y-4 mt-4">
            {risks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Matriz de Riscos</CardTitle>
                </CardHeader>
                <CardContent>
                  <RiskMatrix risks={risks} />
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
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
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{risks.length === 0 ? 'Nenhum risco registrado ainda.' : 'Nenhum risco encontrado com os filtros atuais.'}</p>
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
                            </div>
                          </div>
                          <div className="flex items-start gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(risk)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(risk.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Inteligência ── */}
          <TabsContent value="intelligence" className="mt-4">
            <RiskPredictiveDashboard
              suggestions={intelligence.suggestions}
              alerts={intelligence.alerts}
              healthData={intelligence.healthData}
              isScanning={intelligence.isScanning}
              isRecalculating={intelligence.isRecalculating}
              unreadAlerts={intelligence.unreadAlerts}
              onRunAutoDetect={intelligence.runAutoDetect}
              onRecalculateScores={intelligence.recalculateScores}
              onAcceptSuggestion={intelligence.acceptSuggestion}
              onDismissSuggestion={intelligence.dismissSuggestion}
              onMarkAlertRead={intelligence.markAlertRead}
              onMarkAllAlertsRead={intelligence.markAllAlertsRead}
              onCreateRisk={createRisk}
            />
          </TabsContent>

          {/* ── TAB: Análise IA ── */}
          <TabsContent value="ai" className="mt-4">
            <RiskAiPanel
              risks={risks}
              projectName={project.name}
              projectObject={project.object}
              projectSummary={project.summary}
              onCreateRisk={createRisk}
            />
          </TabsContent>

          {/* ── TAB: Calendário ── */}
          <TabsContent value="calendar" className="mt-4">
            <RiskCalendar risks={risks} />
          </TabsContent>
        </Tabs>

        <RiskFormDialog
          open={formOpen}
          onOpenChange={o => { setFormOpen(o); if (!o) setEditingRisk(null); }}
          onSubmit={handleSubmit}
          initialData={editingRisk ? {
            title: editingRisk.title,
            description: editingRisk.description,
            category: editingRisk.category,
            probability: editingRisk.probability,
            impact: editingRisk.impact,
            status: editingRisk.status,
            mitigation_plan: editingRisk.mitigation_plan,
            contingency_plan: editingRisk.contingency_plan,
            responsible: editingRisk.responsible || '',
            due_date: editingRisk.due_date || '',
          } : undefined}
          isEdit={!!editingRisk}
        />

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={o => { if (!o) setDeleteId(null); }}
          title="Excluir Risco"
          description="Tem certeza que deseja excluir este risco? Esta ação não pode ser desfeita."
          onConfirm={async () => { if (deleteId) await deleteRisk(deleteId); setDeleteId(null); }}
        />
      </div>
    </PageTransition>
  );
};

export default RiskManagement;
