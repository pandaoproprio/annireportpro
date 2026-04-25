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
import { toast } from 'sonner';
import {
  PlusCircle, Edit, Trash2, FileText, Sparkles, Check, X,
  ArrowRight, AlertTriangle, FileSpreadsheet, Loader2, ChevronDown, ChevronUp
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

        <Tabs defaultValue="step1" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="step1" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Passo 1:</span> Proposta
            </TabsTrigger>
            <TabsTrigger value="step2" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Passo 2:</span> Detalhes
            </TabsTrigger>
            <TabsTrigger value="step3" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Passo 3:</span> Justificativa
            </TabsTrigger>
            <TabsTrigger value="step4" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Passo 4:</span> RA
            </TabsTrigger>
          </TabsList>

          {/* ─── PASSO 1: Proposta ─── */}
          <TabsContent value="step1" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Passo 1 — Proposta de Ajuste</h2>
                <p className="text-sm text-muted-foreground">Indique para cada item: manter, alterar ou excluir.</p>
              </div>
              <Button onClick={() => openNewItem(false)} className="gap-2" size="sm">
                <PlusCircle className="w-4 h-4" /> Item Original
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="grid grid-cols-[1fr_2fr_auto_auto_auto] gap-2 p-3 bg-muted/50 text-xs font-medium">
                <span>Nº / Especificação</span>
                <span>Descrição</span>
                <span>Valor Original</span>
                <span>Proposta</span>
                <span>Ações</span>
              </div>
              {originalItems.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Nenhum item cadastrado. Adicione os itens do PT original.
                </div>
              ) : originalItems.map(item => (
                <div key={item.id} className="border-t">
                  <div className="grid grid-cols-[1fr_2fr_auto_auto_auto] gap-2 p-3 items-center text-sm">
                    <div>
                      <span className="font-medium">{item.item_number}</span>
                      <p className="text-xs text-muted-foreground truncate">{item.specification}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs truncate max-w-[300px]">{item.description || '—'}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => toggleExpand(item.id)}>
                        {expandedItems.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>
                    <span className="font-medium whitespace-nowrap">{fmt(Number(item.original_total))}</span>
                    <Select
                      value={item.proposal}
                      onValueChange={async (v) => {
                        await updateItem(item.id, { proposal: v as any });
                        if (v === 'manter') {
                          await updateItem(item.id, {
                            new_specification: item.specification,
                            new_unit_value: item.original_unit_value,
                            new_unit_measure: item.original_unit_measure,
                            new_quantity: item.original_quantity,
                            new_total: item.original_total,
                            justification: 'Item mantido.',
                          } as any);
                        }
                      }}>
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manter">✅ Manter</SelectItem>
                        <SelectItem value="alterar">🔄 Alterar</SelectItem>
                        <SelectItem value="excluir">❌ Excluir</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteTarget({ type: 'item', id: item.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {expandedItems.has(item.id) && (
                    <div className="px-3 pb-3 text-xs text-muted-foreground bg-muted/20">
                      <p>{item.description}</p>
                      {item.executed_amount > 0 && (
                        <p className="mt-1 text-amber-600 font-medium">
                          ⚠️ Valor já executado: {fmt(Number(item.executed_amount))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─── PASSO 2: Detalhes ─── */}
          <TabsContent value="step2" className="mt-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Passo 2 — Descrição do Ajuste</h2>
              <p className="text-sm text-muted-foreground">Descreva os itens alterados e inclua novos itens.</p>
            </div>

            {/* Altered items */}
            {originalItems.filter(i => i.proposal === 'alterar').length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2 text-blue-600">Itens Alterados</h3>
                <div className="space-y-2">
                  {originalItems.filter(i => i.proposal === 'alterar').map(item => (
                    <Card key={item.id} className="border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800">{item.item_number}</Badge>
                              <span className="font-medium">{item.specification}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-muted/50 rounded p-2">
                                <p className="text-xs text-muted-foreground mb-1">DE (Original)</p>
                                <p>{fmt(Number(item.original_unit_value))} × {item.original_quantity} {item.original_unit_measure}</p>
                                <p className="font-bold">{fmt(Number(item.original_total))}</p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                <p className="text-xs text-blue-600 mb-1">PARA (Ajustado)</p>
                                <p>{fmt(Number(item.new_unit_value))} × {item.new_quantity} {item.new_unit_measure}</p>
                                <p className="font-bold text-blue-600">{fmt(Number(item.new_total))}</p>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Excluded items */}
            {originalItems.filter(i => i.proposal === 'excluir').length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2 text-destructive">Itens Excluídos</h3>
                <div className="space-y-2">
                  {originalItems.filter(i => i.proposal === 'excluir').map(item => (
                    <Card key={item.id} className="border-destructive/30 opacity-75">
                      <CardContent className="p-4 flex items-center gap-3">
                        <X className="w-5 h-5 text-destructive shrink-0" />
                        <div>
                          <span className="font-medium">{item.item_number} — {item.specification}</span>
                          <p className="text-sm text-destructive">Item será excluído. {fmt(Number(item.original_total))}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* New items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-sm text-primary">Itens Novos</h3>
                <Button size="sm" onClick={() => openNewItem(true)} className="gap-2">
                  <PlusCircle className="w-4 h-4" /> Incluir Item Novo
                </Button>
              </div>
              {newItems.length === 0 ? (
                <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">
                  Nenhum item novo incluído.
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {newItems.map(item => (
                    <Card key={item.id} className="border-primary/30">
                      <CardContent className="p-4 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-primary border-primary">NOVO</Badge>
                            <span className="font-medium">{item.specification}</span>
                          </div>
                          <p className="text-sm">
                            {fmt(Number(item.new_unit_value))} × {item.new_quantity} {item.new_unit_measure}
                            = <span className="font-bold text-primary">{fmt(Number(item.new_total))}</span>
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive"
                            onClick={() => setDeleteTarget({ type: 'item', id: item.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── PASSO 3: Justificativa ─── */}
          <TabsContent value="step3" className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Passo 3 — Justificativa dos Ajustes</h2>
              <p className="text-sm text-muted-foreground">
                Justifique cada alteração, exclusão ou inclusão de forma detalhada e fundamentada.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Justificativas genéricas não serão aceitas. Use a IA para gerar textos convincentes.
                </p>
              </div>
            </div>

            {items.filter(i => i.proposal !== 'manter').map(item => (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Badge className={PROPOSAL_LABELS[item.is_new_item ? 'alterar' : item.proposal]?.color}>
                        {item.is_new_item ? 'NOVO' : PROPOSAL_LABELS[item.proposal]?.label}
                      </Badge>
                      <span className="font-medium">{item.item_number} {item.specification}</span>
                    </div>
                    <Button
                      variant="outline" size="sm" className="gap-1"
                      disabled={generatingAI === item.id}
                      onClick={() => generateAIJustification(item)}>
                      {generatingAI === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Gerar com IA
                    </Button>
                  </div>
                  <Textarea
                    value={item.justification}
                    onChange={e => updateItem(item.id, { justification: e.target.value } as any)}
                    placeholder="Descreva a justificativa detalhada..."
                    rows={4}
                    className="text-sm"
                  />
                  {/* Price references for altered/new items */}
                  {(item.proposal === 'alterar' || item.is_new_item) && (
                    <div className="bg-muted/30 rounded p-3 space-y-2">
                      <p className="text-xs font-medium">Parâmetros de Preço (3 orçamentos)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(n => (
                          <div key={n} className="space-y-1">
                            <Input
                              placeholder={`Fonte ${n}`}
                              value={(item as any)[`price_ref_${n}`] || ''}
                              onChange={e => updateItem(item.id, { [`price_ref_${n}`]: e.target.value } as any)}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="Valor"
                              type="number"
                              value={(item as any)[`price_ref_${n}_value`] || ''}
                              onChange={e => {
                                const updates: any = { [`price_ref_${n}_value`]: parseFloat(e.target.value) || 0 };
                                // Recalculate average
                                const vals = [1, 2, 3].map(i =>
                                  i === n ? parseFloat(e.target.value) || 0 : Number((item as any)[`price_ref_${i}_value`]) || 0
                                ).filter(v => v > 0);
                                updates.price_average = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                                updateItem(item.id, updates);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                      {item.price_average > 0 && (
                        <p className="text-xs text-muted-foreground">Média: {fmt(Number(item.price_average))}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {items.filter(i => i.proposal !== 'manter').length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                <Check className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Todos os itens estão mantidos. Nenhuma justificativa necessária.</p>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ─── PASSO 4: RA ─── */}
          <TabsContent value="step4" className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Passo 4 — Saldo de Rendimento de Aplicação (RA)</h2>
              <p className="text-sm text-muted-foreground">
                Justifique o uso dos recursos do saldo de RA com cronograma detalhado.
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Saldo de RA disponível (R$)</Label>
                  <Input
                    type="number"
                    value={activeAdjustment.ra_balance || ''}
                    onChange={e => updateAdjustment(activeAdjustment.id, { ra_balance: parseFloat(e.target.value) || 0 } as any)}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label>Justificativa e Cronograma de uso do RA</Label>
                    <Button variant="outline" size="sm" className="gap-1"
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
                    rows={10}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label>Observações adicionais</Label>
                  <Textarea
                    value={activeAdjustment.notes || ''}
                    onChange={e => updateAdjustment(activeAdjustment.id, { notes: e.target.value } as any)}
                    placeholder="Observações..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Item Dialog ─── */}
      <Dialog open={itemDialogOpen} onOpenChange={o => { if (!o) { setItemDialogOpen(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Item' : isNewItem ? 'Incluir Item Novo' : 'Adicionar Item do PT Original'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº do Item</Label>
                <Input value={formData.item_number} onChange={e => setFormData(p => ({ ...p, item_number: e.target.value }))} placeholder="Ex: 1.1" />
              </div>
              <div>
                <Label>Meta/Grupo</Label>
                <Input value={formData.meta_group} onChange={e => setFormData(p => ({ ...p, meta_group: e.target.value }))} placeholder="Ex: META 1" />
              </div>
            </div>

            <div>
              <Label>Especificação do Item</Label>
              <Input value={formData.specification} onChange={e => setFormData(p => ({ ...p, specification: e.target.value }))} placeholder="Nome do item de despesa" />
            </div>

            <div>
              <Label>Descrição do Serviço</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Descrição detalhada..." />
            </div>

            {!isNewItem && (
              <>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-3">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">Valores Originais (DE)</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Valor Unitário</Label>
                      <Input type="number" value={formData.original_unit_value}
                        onChange={e => {
                          const v = e.target.value;
                          const total = (parseFloat(v) || 0) * (parseFloat(formData.original_quantity) || 0);
                          setFormData(p => ({ ...p, original_unit_value: v, original_total: String(total) }));
                        }} />
                    </div>
                    <div>
                      <Label className="text-xs">Unid. Medida</Label>
                      <Input value={formData.original_unit_measure} onChange={e => setFormData(p => ({ ...p, original_unit_measure: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Qtde.</Label>
                      <Input type="number" value={formData.original_quantity}
                        onChange={e => {
                          const v = e.target.value;
                          const total = (parseFloat(formData.original_unit_value) || 0) * (parseFloat(v) || 0);
                          setFormData(p => ({ ...p, original_quantity: v, original_total: String(total) }));
                        }} />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Total</Label>
                      <Input type="number" value={formData.original_total} readOnly className="bg-muted" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Valor já Executado (R$)</Label>
                  <Input type="number" value={formData.executed_amount} onChange={e => setFormData(p => ({ ...p, executed_amount: e.target.value }))} />
                </div>

                <div>
                  <Label>Proposta</Label>
                  <Select value={formData.proposal} onValueChange={(v: any) => setFormData(p => ({ ...p, proposal: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manter">✅ Manter</SelectItem>
                      <SelectItem value="alterar">🔄 Alterar</SelectItem>
                      <SelectItem value="excluir">❌ Excluir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(formData.proposal === 'alterar' || isNewItem) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                  {isNewItem ? 'Dados do Novo Item' : 'Novos Valores (PARA)'}
                </p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Especificação</Label>
                    <Input value={formData.new_specification} onChange={e => setFormData(p => ({ ...p, new_specification: e.target.value }))}
                      placeholder={isNewItem ? 'Nome do novo item' : formData.specification} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Valor Unitário</Label>
                      <Input type="number" value={formData.new_unit_value}
                        onChange={e => {
                          const v = e.target.value;
                          const total = (parseFloat(v) || 0) * (parseFloat(formData.new_quantity) || 0);
                          setFormData(p => ({ ...p, new_unit_value: v, new_total: String(total) }));
                        }} />
                    </div>
                    <div>
                      <Label className="text-xs">Unid. Medida</Label>
                      <Input value={formData.new_unit_measure} onChange={e => setFormData(p => ({ ...p, new_unit_measure: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Qtde.</Label>
                      <Input type="number" value={formData.new_quantity}
                        onChange={e => {
                          const v = e.target.value;
                          const total = (parseFloat(formData.new_unit_value) || 0) * (parseFloat(v) || 0);
                          setFormData(p => ({ ...p, new_quantity: v, new_total: String(total) }));
                        }} />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Total</Label>
                      <Input type="number" value={formData.new_total} readOnly className="bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.proposal === 'excluir' && !isNewItem && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                <p className="text-sm text-destructive font-medium">⚠️ Este item será excluído do orçamento.</p>
                {parseFloat(formData.executed_amount) > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Atenção: Este item possui valor já executado de {fmt(parseFloat(formData.executed_amount))}. Itens parcialmente executados NÃO podem ser excluídos, apenas alterados.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Justificativa</Label>
              <Textarea value={formData.justification} onChange={e => setFormData(p => ({ ...p, justification: e.target.value }))}
                rows={3} placeholder="Justificativa detalhada..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitItem}>
              {editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
