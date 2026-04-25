import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectData } from '@/contexts/ProjectContext';
import { useBudgetAdjustments, BudgetAdjustment, BudgetAdjustmentItem } from '@/hooks/useBudgetAdjustments';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BudgetAdjustmentGuidancePanel } from '@/components/budget/BudgetAdjustmentGuidancePanel';
import { BudgetAdjustmentSpreadsheet } from '@/components/budget/BudgetAdjustmentSpreadsheet';
import { toast } from 'sonner';
import {
  PlusCircle, Trash2, Sparkles,
  ArrowRight, FileSpreadsheet, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PROPOSAL_LABELS: Record<string, { label: string; color: string }> = {
  manter: { label: 'Manter', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  alterar: { label: 'Alterar', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  excluir: { label: 'Excluir', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

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
    items, originalItems, newItems, isLoading,
    createAdjustment, updateAdjustment, deleteAdjustment,
    addItem, updateItem, deleteItem, summary,
  } = useBudgetAdjustments(project?.id);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetAdjustmentItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'adj' | 'item'; id: string } | null>(null);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Item form state
  const [formData, setFormData] = useState({
    item_number: '', specification: '', description: '',
    original_unit_value: '', original_unit_measure: 'Mês', original_quantity: '', original_total: '',
    executed_amount: '',
    proposal: 'manter' as 'manter' | 'alterar' | 'excluir',
    new_specification: '', new_unit_value: '', new_unit_measure: 'Mês', new_quantity: '', new_total: '',
    justification: '', meta_group: '',
    price_ref_1: '', price_ref_1_value: '', price_ref_2: '', price_ref_2_value: '',
    price_ref_3: '', price_ref_3_value: '', price_average: '',
  });

  if (!user) return <Navigate to="/login" replace />;
  if (!project) return (
    <PageTransition>
      <div className="p-6 text-center text-muted-foreground">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Selecione um projeto para gerenciar ajustes de PT.</p>
      </div>
    </PageTransition>
  );

  const resetForm = () => setFormData({
    item_number: '', specification: '', description: '',
    original_unit_value: '', original_unit_measure: 'Mês', original_quantity: '', original_total: '',
    executed_amount: '', proposal: 'manter',
    new_specification: '', new_unit_value: '', new_unit_measure: 'Mês', new_quantity: '', new_total: '',
    justification: '', meta_group: '',
    price_ref_1: '', price_ref_1_value: '', price_ref_2: '', price_ref_2_value: '',
    price_ref_3: '', price_ref_3_value: '', price_average: '',
  });

  const openNewItem = (isNew: boolean) => {
    resetForm();
    setEditingItem(null);
    setIsNewItem(isNew);
    if (isNew) setFormData(prev => ({ ...prev, proposal: 'alterar' }));
    setItemDialogOpen(true);
  };

  const openEditItem = (item: BudgetAdjustmentItem) => {
    setEditingItem(item);
    setIsNewItem(item.is_new_item);
    setFormData({
      item_number: item.item_number,
      specification: item.specification,
      description: item.description,
      original_unit_value: String(item.original_unit_value),
      original_unit_measure: item.original_unit_measure,
      original_quantity: String(item.original_quantity),
      original_total: String(item.original_total),
      executed_amount: String(item.executed_amount),
      proposal: item.proposal,
      new_specification: item.new_specification,
      new_unit_value: String(item.new_unit_value),
      new_unit_measure: item.new_unit_measure,
      new_quantity: String(item.new_quantity),
      new_total: String(item.new_total),
      justification: item.justification,
      meta_group: item.meta_group,
      price_ref_1: item.price_ref_1, price_ref_1_value: String(item.price_ref_1_value),
      price_ref_2: item.price_ref_2, price_ref_2_value: String(item.price_ref_2_value),
      price_ref_3: item.price_ref_3, price_ref_3_value: String(item.price_ref_3_value),
      price_average: String(item.price_average),
    });
    setItemDialogOpen(true);
  };

  const handleSubmitItem = async () => {
    if (!activeAdjustment) return;
    const payload: any = {
      ...formData,
      original_unit_value: parseFloat(formData.original_unit_value) || 0,
      original_quantity: parseFloat(formData.original_quantity) || 0,
      original_total: parseFloat(formData.original_total) || 0,
      executed_amount: parseFloat(formData.executed_amount) || 0,
      new_unit_value: parseFloat(formData.new_unit_value) || 0,
      new_quantity: parseFloat(formData.new_quantity) || 0,
      new_total: parseFloat(formData.new_total) || 0,
      price_ref_1_value: parseFloat(formData.price_ref_1_value) || 0,
      price_ref_2_value: parseFloat(formData.price_ref_2_value) || 0,
      price_ref_3_value: parseFloat(formData.price_ref_3_value) || 0,
      price_average: parseFloat(formData.price_average) || 0,
      is_new_item: isNewItem,
      sort_order: editingItem ? editingItem.sort_order : items.length,
    };

    let ok: boolean;
    if (editingItem) {
      ok = await updateItem(editingItem.id, payload);
    } else {
      ok = await addItem(activeAdjustment.id, payload);
    }
    if (ok) {
      setItemDialogOpen(false);
      resetForm();
    }
  };

  const generateAIJustification = async (item: BudgetAdjustmentItem) => {
    setGeneratingAI(item.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-adjustment-justification', {
        body: {
          item: {
            specification: item.specification,
            description: item.description,
            proposal: item.proposal,
            original_total: item.original_total,
            new_total: item.new_total,
            executed_amount: item.executed_amount,
            is_new_item: item.is_new_item,
          },
          type: 'item_justification',
          projectContext: `${project.name} - ${project.object}`,
        },
      });
      if (error) throw error;
      if (data?.justification) {
        await updateItem(item.id, { justification: data.justification } as any);
        toast.success('Justificativa gerada por IA');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar justificativa');
    }
    setGeneratingAI(null);
  };

  const generateRAJustification = async () => {
    if (!activeAdjustment) return;
    setGeneratingAI('ra');
    try {
      const raItems = [...items.filter(i => i.is_new_item), ...items.filter(i => i.proposal === 'alterar')]
        .map(i => `- ${i.specification}: ${fmt(Number(i.new_total))}`)
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

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
