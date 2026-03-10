import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectData } from '@/contexts/ProjectContext';
import { useSprints, Sprint, SprintItem, SprintForm, SprintItemForm, SPRINT_STATUS_LABELS, ITEM_STATUS_LABELS } from '@/hooks/useSprints';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlusCircle, Play, CheckCircle, Trash2, Zap, Target, TrendingUp,
  LayoutList, ArrowRight, Clock, X, Gauge
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const statusColor: Record<string, string> = {
  planning: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-destructive/10 text-destructive',
};

const itemStatusColor: Record<string, string> = {
  todo: 'secondary',
  in_progress: 'default',
  done: 'outline',
  blocked: 'destructive',
};

const SprintDashboard: React.FC = () => {
  const { user } = useAuth();
  const { activeProject: project } = useProjectData();
  const {
    sprints, items, isLoading,
    createSprint, startSprint, completeSprint, deleteSprint,
    createItem, updateItemStatus, deleteItem,
    getBurndown, velocityHistory, avgVelocity,
  } = useSprints(project?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'sprint' | 'item'; id: string } | null>(null);
  const [sprintForm, setSprintForm] = useState<SprintForm>({ name: '', goal: '', start_date: '', end_date: '' });
  const [itemForm, setItemForm] = useState<SprintItemForm>({ title: '', description: '', story_points: '1', assignee_name: '' });
  const [saving, setSaving] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!project) return (
    <PageTransition>
      <div className="p-6 text-center text-muted-foreground">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Selecione um projeto para gerenciar sprints.</p>
      </div>
    </PageTransition>
  );

  const activeSprint = sprints.find(s => s.status === 'active');
  const current = selectedSprint ? sprints.find(s => s.id === selectedSprint) : activeSprint || sprints[0];
  const currentItems = current ? items.filter(i => i.sprint_id === current.id) : [];
  const burndownData = current ? getBurndown(current.id) : [];

  const totalPoints = currentItems.reduce((s, i) => s + i.story_points, 0);
  const donePoints = currentItems.filter(i => i.status === 'done').reduce((s, i) => s + i.story_points, 0);
  const progress = totalPoints > 0 ? (donePoints / totalPoints) * 100 : 0;

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await createSprint(sprintForm);
    setSaving(false);
    if (ok) { setShowCreate(false); setSprintForm({ name: '', goal: '', start_date: '', end_date: '' }); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddItem) return;
    setSaving(true);
    const ok = await createItem(showAddItem, itemForm);
    setSaving(false);
    if (ok) { setShowAddItem(null); setItemForm({ title: '', description: '', story_points: '1', assignee_name: '' }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'sprint') await deleteSprint(deleteTarget.id);
    else await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Sprints & Velocity
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <PlusCircle className="w-4 h-4" /> Nova Sprint
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sprints Ativas</p>
                    <p className="text-xl font-bold">{sprints.filter(s => s.status === 'active').length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sprints Concluídas</p>
                    <p className="text-xl font-bold">{sprints.filter(s => s.status === 'completed').length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Gauge className="w-8 h-8 text-chart-2" />
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidade Média</p>
                    <p className="text-xl font-bold">{avgVelocity.toFixed(1)} pts</p>
                  </div>
                </CardContent>
              </Card>
              {current && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Progresso Atual</p>
                    <p className="text-xl font-bold mb-2">{donePoints}/{totalPoints} pts</p>
                    <Progress value={progress} className="h-2" />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sprint selector */}
            {sprints.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sprints.map(s => (
                  <Button
                    key={s.id}
                    variant={current?.id === s.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSprint(s.id)}
                    className="gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${statusColor[s.status]}`} />
                    {s.name}
                    <Badge variant="outline" className="text-xs ml-1">{SPRINT_STATUS_LABELS[s.status]}</Badge>
                  </Button>
                ))}
              </div>
            )}

            {current && (
              <>
                {/* Sprint header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-lg font-bold">{current.name}</h2>
                        {current.goal && <p className="text-sm text-muted-foreground mt-1">{current.goal}</p>}
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {current.start_date} → {current.end_date}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {current.status === 'planning' && (
                          <Button size="sm" onClick={() => startSprint(current.id)} className="gap-1">
                            <Play className="w-4 h-4" /> Iniciar
                          </Button>
                        )}
                        {current.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => completeSprint(current.id)} className="gap-1">
                            <CheckCircle className="w-4 h-4" /> Concluir
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setShowAddItem(current.id)} className="gap-1">
                          <PlusCircle className="w-4 h-4" /> Item
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'sprint', id: current.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Burndown Chart */}
                {burndownData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Burndown Chart</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={burndownData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Ideal" dot={false} />
                          <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" name="Real" strokeWidth={2} connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Sprint Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LayoutList className="w-5 h-5" /> Itens da Sprint ({currentItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">Nenhum item na sprint.</p>
                    ) : (
                      <div className="space-y-2">
                        {currentItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Badge variant={itemStatusColor[item.status] as any} className="shrink-0">
                                {ITEM_STATUS_LABELS[item.status]}
                              </Badge>
                              <div className="min-w-0">
                                <p className={`font-medium truncate ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.title}
                                </p>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  <span>{item.story_points} pts</span>
                                  {item.assignee_name && <span>• {item.assignee_name}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.status !== 'done' && (
                                <Select
                                  value={item.status}
                                  onValueChange={(v) => updateItemStatus(item.id, v as SprintItem['status'])}
                                >
                                  <SelectTrigger className="w-28 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ITEM_STATUS_LABELS).map(([k, v]) => (
                                      <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: 'item', id: item.id })}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Velocity Chart */}
            {velocityHistory.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Velocidade por Sprint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={velocityHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" name="Planejado" radius={[4,4,0,0]} />
                      <Bar dataKey="completed" fill="hsl(var(--primary))" name="Entregue" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {sprints.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium mb-1">Nenhuma sprint criada</p>
                  <p className="text-sm mb-4">Crie sua primeira sprint para organizar entregas em ciclos.</p>
                  <Button onClick={() => setShowCreate(true)} className="gap-2">
                    <PlusCircle className="w-4 h-4" /> Criar Sprint
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Create Sprint Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Sprint</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={sprintForm.name} onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Sprint 1" />
              </div>
              <div>
                <Label>Meta</Label>
                <Textarea value={sprintForm.goal} onChange={e => setSprintForm(f => ({ ...f, goal: e.target.value }))} rows={2} placeholder="Objetivo principal desta sprint..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início *</Label>
                  <Input type="date" value={sprintForm.start_date} onChange={e => setSprintForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Fim *</Label>
                  <Input type="date" value={sprintForm.end_date} onChange={e => setSprintForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !sprintForm.name || !sprintForm.start_date || !sprintForm.end_date}>
                  {saving ? 'Criando...' : 'Criar Sprint'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Item Dialog */}
        <Dialog open={!!showAddItem} onOpenChange={o => { if (!o) setShowAddItem(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Adicionar Item</DialogTitle></DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Implementar dashboard" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Story Points</Label>
                  <Input type="number" min="1" max="21" value={itemForm.story_points} onChange={e => setItemForm(f => ({ ...f, story_points: e.target.value }))} />
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input value={itemForm.assignee_name} onChange={e => setItemForm(f => ({ ...f, assignee_name: e.target.value }))} placeholder="Nome" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddItem(null)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !itemForm.title}>
                  {saving ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={o => { if (!o) setDeleteTarget(null); }}
          title={deleteTarget?.type === 'sprint' ? 'Excluir Sprint' : 'Excluir Item'}
          description="Tem certeza? Esta ação não pode ser desfeita."
          onConfirm={handleDelete}
        />
      </div>
    </PageTransition>
  );
};

export default SprintDashboard;
