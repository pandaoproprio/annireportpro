import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, CheckCircle, XCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface ResolvedRisk {
  id: string;
  title: string;
  category: string;
  probability: string;
  impact: string;
  status: string;
  mitigation_plan: string;
  resolved_at: string | null;
  project_name?: string;
  metadata?: any;
}

interface Props {
  risks: ResolvedRisk[];
  onSaveLesson: (riskId: string, lesson: { what_worked: string; what_failed: string; recommendation: string }) => void;
}

export const RiskLessonsLearned: React.FC<Props> = ({ risks, onSaveLesson }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ResolvedRisk | null>(null);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatFailed, setWhatFailed] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const resolvedRisks = risks.filter(r => r.status === 'resolvido' || r.resolved_at);

  const openDialog = (risk: ResolvedRisk) => {
    setSelectedRisk(risk);
    const existing = risk.metadata?.lessons_learned;
    setWhatWorked(existing?.what_worked || '');
    setWhatFailed(existing?.what_failed || '');
    setRecommendation(existing?.recommendation || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedRisk) return;
    onSaveLesson(selectedRisk.id, { what_worked: whatWorked, what_failed: whatFailed, recommendation });
    setDialogOpen(false);
  };

  const lessonsCount = resolvedRisks.filter(r => r.metadata?.lessons_learned).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Lições Aprendidas
            <Badge variant="secondary">{lessonsCount}/{resolvedRisks.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Registre o que funcionou e o que não funcionou na mitigação de riscos resolvidos.
          </p>
        </CardHeader>
        <CardContent>
          {resolvedRisks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum risco resolvido para registrar lições aprendidas.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {resolvedRisks.map(risk => {
                const hasLesson = !!risk.metadata?.lessons_learned;
                const lesson = risk.metadata?.lessons_learned;
                return (
                  <div key={risk.id} className={`border rounded-lg p-3 ${hasLesson ? 'border-green-500/30 bg-green-50/50 dark:bg-green-500/5' : 'border-dashed'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {hasLesson ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                          <span className="text-sm font-medium truncate">{risk.title}</span>
                        </div>
                        {risk.project_name && (
                          <p className="text-[10px] text-muted-foreground ml-6">📁 {risk.project_name}</p>
                        )}
                        {hasLesson && (
                          <div className="ml-6 mt-2 space-y-1 text-xs text-muted-foreground">
                            {lesson.what_worked && (
                              <p><span className="text-green-600 font-medium">✅ Funcionou:</span> {lesson.what_worked}</p>
                            )}
                            {lesson.what_failed && (
                              <p><span className="text-destructive font-medium">❌ Não funcionou:</span> {lesson.what_failed}</p>
                            )}
                            {lesson.recommendation && (
                              <p><span className="text-primary font-medium">💡 Recomendação:</span> {lesson.recommendation}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant={hasLesson ? 'outline' : 'default'} onClick={() => openDialog(risk)} className="shrink-0 gap-1 text-xs">
                        {hasLesson ? 'Editar' : <><Plus className="w-3 h-3" /> Registrar</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Lição Aprendida
            </DialogTitle>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{selectedRisk.title}</p>
                {selectedRisk.mitigation_plan && (
                  <p className="text-xs text-muted-foreground mt-1">Plano: {selectedRisk.mitigation_plan}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-green-600">✅ O que funcionou?</Label>
                <Textarea
                  value={whatWorked}
                  onChange={e => setWhatWorked(e.target.value)}
                  placeholder="Descreva as estratégias e ações que foram eficazes..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-destructive">❌ O que NÃO funcionou?</Label>
                <Textarea
                  value={whatFailed}
                  onChange={e => setWhatFailed(e.target.value)}
                  placeholder="Descreva as abordagens que falharam ou foram insuficientes..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-primary">💡 Recomendação para projetos futuros</Label>
                <Textarea
                  value={recommendation}
                  onChange={e => setRecommendation(e.target.value)}
                  placeholder="O que você faria diferente? O que replicaria?"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Lição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
