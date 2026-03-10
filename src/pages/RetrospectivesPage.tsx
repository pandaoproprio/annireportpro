import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectData } from '@/contexts/ProjectContext';
import { useRetrospectives, Retrospective } from '@/hooks/useRetrospectives';
import { useSprints } from '@/hooks/useSprints';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PlusCircle, Trash2, ThumbsUp, ThumbsDown, ListChecks, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RetrospectivesPage: React.FC = () => {
  const { user } = useAuth();
  const { activeProject: project } = useProjectData();
  const { retrospectives, isLoading, create, remove } = useRetrospectives(project?.id);
  const { sprints } = useSprints(project?.id);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [wentWell, setWentWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [actionText, setActionText] = useState('');
  const [actions, setActions] = useState<{ text: string; done: boolean }[]>([]);
  const [sprintId, setSprintId] = useState('none');

  if (!project) return <Navigate to="/" replace />;

  const resetForm = () => {
    setWentWell('');
    setToImprove('');
    setActions([]);
    setActionText('');
    setSprintId('none');
  };

  const handleAddAction = () => {
    if (!actionText.trim()) return;
    setActions(prev => [...prev, { text: actionText.trim(), done: false }]);
    setActionText('');
  };

  const handleSubmit = async () => {
    if (!wentWell.trim() && !toImprove.trim()) {
      toast.error('Preencha pelo menos um campo.');
      return;
    }
    try {
      await create.mutateAsync({
        went_well: wentWell,
        to_improve: toImprove,
        action_items: actions,
        sprint_id: sprintId !== 'none' ? sprintId : undefined,
      });
      toast.success('Retrospectiva registrada!');
      resetForm();
      setShowForm(false);
    } catch {
      toast.error('Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      toast.success('Retrospectiva removida.');
    } catch {
      toast.error('Erro ao remover.');
    }
    setDeleteId(null);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-primary" />
              Retrospectivas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Lições aprendidas e ações de melhoria</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <PlusCircle className="w-4 h-4 mr-2" /> Nova Retrospectiva
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : retrospectives.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma retrospectiva registrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {retrospectives.map((retro) => {
              const sprint = sprints.find(s => s.id === retro.sprint_id);
              const actionItems = Array.isArray(retro.action_items) ? retro.action_items : [];
              return (
                <Card key={retro.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {sprint ? `Sprint: ${sprint.name}` : 'Retrospectiva Geral'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(retro.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {retro.user_id === user?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(retro.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {retro.went_well && (
                      <div>
                        <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-1">
                          <ThumbsUp className="w-3 h-3" /> O que deu certo
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{retro.went_well}</p>
                      </div>
                    )}
                    {retro.to_improve && (
                      <div>
                        <p className="text-xs font-semibold text-orange-600 flex items-center gap-1 mb-1">
                          <ThumbsDown className="w-3 h-3" /> O que melhorar
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{retro.to_improve}</p>
                      </div>
                    )}
                    {actionItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
                          <ListChecks className="w-3 h-3" /> Ações ({actionItems.length})
                        </p>
                        <ul className="space-y-1">
                          {actionItems.map((a: any, i: number) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <span className={a.done ? 'line-through text-muted-foreground' : 'text-foreground'}>• {a.text}</span>
                              {a.done && <Badge variant="outline" className="text-[10px] px-1 py-0">✓</Badge>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Retrospectiva</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sprint (opcional)</Label>
                <Select value={sprintId} onValueChange={setSprintId}>
                  <SelectTrigger><SelectValue placeholder="Geral" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral</SelectItem>
                    {sprints.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-green-600">O que deu certo</Label>
                <Textarea value={wentWell} onChange={e => setWentWell(e.target.value)} rows={3} placeholder="Pontos positivos..." />
              </div>
              <div>
                <Label className="text-orange-600">O que melhorar</Label>
                <Textarea value={toImprove} onChange={e => setToImprove(e.target.value)} rows={3} placeholder="Pontos de melhoria..." />
              </div>
              <div>
                <Label>Ações de Melhoria</Label>
                <div className="flex gap-2">
                  <Input value={actionText} onChange={e => setActionText(e.target.value)} placeholder="Nova ação..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAction())} />
                  <Button variant="outline" size="sm" onClick={handleAddAction}>+</Button>
                </div>
                {actions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {actions.map((a, i) => (
                      <li key={i} className="text-sm flex items-center justify-between bg-muted rounded px-2 py-1">
                        <span>{a.text}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setActions(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={create.isPending} className="w-full">
                {create.isPending ? 'Salvando...' : 'Salvar Retrospectiva'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteId}
          title="Excluir Retrospectiva"
          description="Deseja realmente excluir esta retrospectiva?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </PageTransition>
  );
};

export default RetrospectivesPage;
