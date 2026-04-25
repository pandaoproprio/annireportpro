import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectData } from '@/contexts/ProjectContext';
import { useBudgetAdjustments } from '@/hooks/useBudgetAdjustments';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BudgetAdjustmentGuidancePanel } from '@/components/budget/BudgetAdjustmentGuidancePanel';
import { BudgetAdjustmentSpreadsheet } from '@/components/budget/BudgetAdjustmentSpreadsheet';
import { LinkedJustificationsCard } from '@/components/budget/LinkedJustificationsCard';
import { toast } from 'sonner';
import {
  PlusCircle, Trash2, Sparkles,
  ArrowRight, FileSpreadsheet, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  em_analise: { label: 'Em Análise', variant: 'default' },
  aprovado: { label: 'Aprovado', variant: 'outline' },
  devolvido: { label: 'Devolvido', variant: 'destructive' },
};

const BudgetAdjustmentPage: React.FC = () => {
  const { user } = useAuth();
  const { activeProject: project } = useProjectData();
  const {
    adjustments, activeAdjustment, setActiveAdjustment,
    items, isLoading,
    createAdjustment, updateAdjustment, deleteAdjustment,
    addItem, updateItem, deleteItem, summary,
  } = useBudgetAdjustments(project?.id);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'adj' | 'item'; id: string } | null>(null);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);

  if (!user) return <Navigate to="/login" replace />;
  if (!project) return (
    <PageTransition>
      <div className="p-6 text-center text-muted-foreground">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Selecione um projeto para gerenciar ajustes de PT.</p>
      </div>
    </PageTransition>
  );

  const generateRAJustification = async () => {
    if (!activeAdjustment) return;
    setGeneratingAI('ra');
    try {
      const raItems = [...items.filter(i => i.is_new_item), ...items.filter(i => i.proposal === 'alterar')]
        .map(i => `- ${i.new_specification || i.specification}: ${fmt(Number(i.new_total))}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('generate-adjustment-justification', {
        body: {
          item: {
            ra_balance: activeAdjustment.ra_balance,
            ra_items: raItems,
          },
          type: 'ra_justification',
          projectContext: `${project.name} - ${project.object}`,
        },
      });
      if (error) throw error;
      if (data?.justification) {
        await updateAdjustment(activeAdjustment.id, { ra_justification: data.justification } as any);
        toast.success('Justificativa de RA gerada por IA');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar justificativa de RA');
    }
    setGeneratingAI(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'adj') await deleteAdjustment(deleteTarget.id);
    else await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ─── LIST VIEW (no active adjustment) ───
  if (!activeAdjustment) {
    return (
      <PageTransition>
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
                Ajuste de PT / RA
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
            </div>
            <Button onClick={async () => {
              const adj = await createAdjustment();
              if (adj) setActiveAdjustment(adj);
            }} className="gap-2">
              <PlusCircle className="w-4 h-4" /> Novo Ajuste
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : adjustments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="mb-2">Nenhum ajuste de PT cadastrado.</p>
              <p className="text-xs">Clique em "Novo Ajuste" para começar.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {adjustments.map(adj => (
                <Card key={adj.id} className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => setActiveAdjustment(adj)}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{adj.title}</span>
                        <Badge variant={STATUS_LABELS[adj.status]?.variant || 'secondary'}>
                          {STATUS_LABELS[adj.status]?.label || adj.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criado em {format(new Date(adj.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'adj', id: adj.id }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={o => { if (!o) setDeleteTarget(null); }}
          title="Excluir"
          description="Tem certeza? Esta ação não pode ser desfeita."
          onConfirm={handleDelete}
        />
      </PageTransition>
    );
  }

  // ─── DETAIL VIEW (active adjustment) ───
  return (
    <PageTransition>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setActiveAdjustment(null)} className="mb-2">
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              {activeAdjustment.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_LABELS[activeAdjustment.status]?.variant}>
                {STATUS_LABELS[activeAdjustment.status]?.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{project.name}</span>
            </div>
          </div>
        </div>

        {/* Guidance + Import/Export panel */}
        <BudgetAdjustmentGuidancePanel
          adjustment={activeAdjustment}
          items={items}
          projectName={project.name}
          onAddItem={addItem}
          onUpdateItem={updateItem}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Itens</p>
            <p className="text-xl font-bold">{summary.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-green-600">Mantidos</p>
            <p className="text-xl font-bold text-green-600">{summary.mantidos}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-blue-600">Alterados</p>
            <p className="text-xl font-bold text-blue-600">{summary.alterados}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-destructive">Excluídos</p>
            <p className="text-xl font-bold text-destructive">{summary.excluidos}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-primary">Novos</p>
            <p className="text-xl font-bold text-primary">{summary.novos}</p>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Valor Original Total</p>
            <p className="text-lg font-bold">{fmt(summary.originalTotal)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Valor Ajustado Total</p>
            <p className="text-lg font-bold text-primary">{fmt(summary.newTotal)}</p>
            {summary.newTotal !== summary.originalTotal && (
              <p className={`text-xs ${summary.newTotal > summary.originalTotal ? 'text-destructive' : 'text-green-600'}`}>
                {summary.newTotal > summary.originalTotal ? '+' : ''}{fmt(summary.newTotal - summary.originalTotal)}
              </p>
            )}
          </CardContent></Card>
        </div>

        {/* ─── PLANILHA INLINE (replica o modelo CEAP_AJUSTE_DE_PT_RA) ─── */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-lg font-semibold">Planilha de Ajuste</h2>
              <p className="text-xs text-muted-foreground">
                Preencha como na planilha oficial: escolha a proposta (manter / alterar / excluir) em cada linha.
                Itens "manter" copiam o original automaticamente; "alterar" libera os campos PARA, justificativa e parâmetros de preço.
              </p>
            </div>
          </div>
          <BudgetAdjustmentSpreadsheet
            items={items}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onDeleteItem={(id) => deleteItem(id)}
            adjustmentId={activeAdjustment.id}
            projectContext={`${project.name} - ${project.object || ''}`}
          />
        </div>

        {/* ─── Saldo de Rendimento de Aplicação (RA) ─── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Saldo de Rendimento de Aplicação (RA)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Justifique o uso dos recursos do saldo de RA com cronograma detalhado.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Saldo de RA disponível (R$)</Label>
              <Input
                type="number"
                value={activeAdjustment.ra_balance || ''}
                onChange={e => updateAdjustment(activeAdjustment.id, { ra_balance: parseFloat(e.target.value) || 0 } as any)}
                placeholder="0,00"
                className="max-w-xs"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs">Justificativa e cronograma de uso do RA</Label>
                <Button variant="outline" size="sm" className="gap-1 h-7"
                  disabled={generatingAI === 'ra'}
                  onClick={generateRAJustification}>
                  {generatingAI === 'ra' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                value={activeAdjustment.ra_justification || ''}
                onChange={e => updateAdjustment(activeAdjustment.id, { ra_justification: e.target.value } as any)}
                placeholder="Descreva a justificativa e o cronograma detalhado das atividades..."
                rows={6}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Observações adicionais</Label>
              <Textarea
                value={activeAdjustment.notes || ''}
                onChange={e => updateAdjustment(activeAdjustment.id, { notes: e.target.value } as any)}
                placeholder="Observações..."
                rows={2}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Justificativas jurídicas vinculadas ─── */}
        <LinkedJustificationsCard adjustmentId={activeAdjustment.id} projectId={project.id} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null); }}
        title="Excluir"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
    </PageTransition>
  );
};

export default BudgetAdjustmentPage;
