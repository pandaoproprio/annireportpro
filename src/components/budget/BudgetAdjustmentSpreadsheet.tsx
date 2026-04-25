import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BudgetAdjustmentItem, AdjustmentItemForm } from '@/hooks/useBudgetAdjustments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, PlusCircle, Sparkles, Loader2, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const fmt = (v: number) =>
  `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Proposal = 'manter' | 'alterar' | 'excluir';

interface Props {
  items: BudgetAdjustmentItem[];
  onUpdateItem: (id: string, updates: Partial<AdjustmentItemForm>) => Promise<boolean>;
  onAddItem: (adjustmentId: string, item: Partial<AdjustmentItemForm>) => Promise<boolean>;
  onDeleteItem: (id: string) => Promise<boolean>;
  adjustmentId: string;
  projectContext: string;
}

/**
 * Planilha replicada (CEAP_AJUSTE_DE_PT_RA):
 *  - Linhas agrupadas por META (meta_group)
 *  - Colunas DE (originais, somente leitura) | Proposta | PARA (auto/edit) | Justificativa | Parâmetros
 *  - Proposta MANTER: PARA copia DE e fica desabilitado
 *  - Proposta ALTERAR: PARA editável; justificativa e ≥1 parâmetro obrigatórios
 *  - Proposta EXCLUIR: PARA vazio/desabilitado; só justificativa obrigatória
 *  - Itens novos: linha avulsa marcada como NOVO (DE vazio, PARA editável)
 */
export const BudgetAdjustmentSpreadsheet: React.FC<Props> = ({
  items, onUpdateItem, onAddItem, onDeleteItem, adjustmentId, projectContext,
}) => {
  // Local debounced cache to avoid hitting the DB on every keystroke
  const [draft, setDraft] = useState<Record<string, Partial<BudgetAdjustmentItem>>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const timers = useRef<Record<string, any>>({});

  // Reset local drafts when items change from the server
  useEffect(() => { setDraft({}); }, [items.map(i => i.id + i.updated_at).join('|')]);

  const getValue = <K extends keyof BudgetAdjustmentItem>(item: BudgetAdjustmentItem, key: K): any =>
    draft[item.id]?.[key] !== undefined ? draft[item.id]![key] : item[key];

  const queueSave = (id: string, patch: Partial<BudgetAdjustmentItem>, immediate = false) => {
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    clearTimeout(timers.current[id]);
    const delay = immediate ? 0 : 600;
    timers.current[id] = setTimeout(() => {
      onUpdateItem(id, patch as any);
    }, delay);
  };

  const handleProposalChange = (item: BudgetAdjustmentItem, value: Proposal) => {
    if (value === 'manter') {
      queueSave(item.id, {
        proposal: value,
        new_specification: item.specification,
        new_unit_value: item.original_unit_value,
        new_unit_measure: item.original_unit_measure,
        new_quantity: item.original_quantity,
        new_total: item.original_total,
      } as any, true);
    } else if (value === 'excluir') {
      queueSave(item.id, {
        proposal: value,
        new_specification: '',
        new_unit_value: 0,
        new_quantity: 0,
        new_total: 0,
      } as any, true);
    } else {
      // alterar: pré-preenche com original para o usuário editar
      queueSave(item.id, {
        proposal: value,
        new_specification: item.new_specification || item.specification,
        new_unit_value: item.new_unit_value || item.original_unit_value,
        new_unit_measure: item.new_unit_measure || item.original_unit_measure,
        new_quantity: item.new_quantity || item.original_quantity,
        new_total: item.new_total || item.original_total,
      } as any, true);
    }
  };

  const handleNewValueChange = (
    item: BudgetAdjustmentItem,
    field: 'new_unit_value' | 'new_quantity',
    raw: string,
  ) => {
    const num = parseFloat(raw.replace(',', '.')) || 0;
    const otherField = field === 'new_unit_value' ? 'new_quantity' : 'new_unit_value';
    const other = Number(getValue(item, otherField as any)) || 0;
    queueSave(item.id, {
      [field]: num,
      new_total: num * other,
    } as any);
  };

  const handlePriceRefChange = (
    item: BudgetAdjustmentItem,
    n: 1 | 2 | 3,
    field: 'name' | 'value',
    raw: string,
  ) => {
    if (field === 'name') {
      queueSave(item.id, { [`price_ref_${n}`]: raw } as any);
      return;
    }
    const num = parseFloat(raw.replace(',', '.')) || 0;
    const all = [1, 2, 3].map(i =>
      i === n ? num : Number(getValue(item, `price_ref_${i}_value` as any)) || 0
    ).filter(v => v > 0);
    const avg = all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : 0;
    queueSave(item.id, {
      [`price_ref_${n}_value`]: num,
      price_average: avg,
    } as any);
  };

  const generateAI = async (item: BudgetAdjustmentItem) => {
    setGeneratingAI(item.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-adjustment-justification', {
        body: {
          item: {
            specification: item.specification || item.new_specification,
            description: item.description,
            proposal: item.proposal,
            original_total: item.original_total,
            new_total: item.new_total,
            executed_amount: item.executed_amount,
            is_new_item: item.is_new_item,
          },
          type: 'item_justification',
          projectContext,
        },
      });
      if (error) throw error;
      if (data?.justification) {
        await onUpdateItem(item.id, { justification: data.justification } as any);
        toast.success('Justificativa gerada');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar justificativa');
    }
    setGeneratingAI(null);
  };

  // Agrupar por META
  const groups = useMemo(() => {
    const map = new Map<string, BudgetAdjustmentItem[]>();
    for (const it of items) {
      const key = (it.meta_group || 'Sem META').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [items]);

  const addNewLine = async (metaGroup: string) => {
    const ok = await onAddItem(adjustmentId, {
      meta_group: metaGroup,
      item_number: '',
      specification: '',
      description: '',
      original_unit_value: 0,
      original_unit_measure: 'Mês',
      original_quantity: 0,
      original_total: 0,
      executed_amount: 0,
      proposal: 'alterar' as any,
      new_specification: '',
      new_unit_value: 0,
      new_unit_measure: 'Mês',
      new_quantity: 0,
      new_total: 0,
      justification: '',
      sort_order: items.length,
      is_new_item: true,
    } as any);
    if (ok) toast.success('Item novo adicionado');
  };

  // Validações inline (warnings, não bloqueiam)
  const getWarning = (item: BudgetAdjustmentItem): string | null => {
    const proposal = getValue(item, 'proposal') as Proposal;
    const exec = Number(item.executed_amount) || 0;
    if (proposal === 'excluir' && exec > 0) {
      return `Item já executado (${fmt(exec)}). Itens com execução parcial não podem ser excluídos.`;
    }
    const newTotal = Number(getValue(item, 'new_total')) || 0;
    if (proposal === 'alterar' && newTotal > 0 && newTotal < exec) {
      return `Novo valor (${fmt(newTotal)}) é inferior ao já executado (${fmt(exec)}).`;
    }
    return null;
  };

  const isEmpty = items.length === 0;

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-muted/60 sticky top-0 z-10">
          <tr>
            <th className="p-2 text-left w-8"></th>
            <th className="p-2 text-left border-r" colSpan={4}>
              <span className="text-orange-700 dark:text-orange-300">DE</span>
            </th>
            <th className="p-2 text-center border-r bg-orange-50 dark:bg-orange-900/20">PROPOSTA</th>
            <th className="p-2 text-left border-r bg-blue-50 dark:bg-blue-900/20" colSpan={4}>
              <span className="text-blue-700 dark:text-blue-300">PARA</span>
            </th>
            <th className="p-2 text-left">Ações</th>
          </tr>
          <tr className="bg-muted/40 text-[11px]">
            <th className="p-2"></th>
            <th className="p-2 text-left">Nº / Especificação</th>
            <th className="p-2 text-right">V. Unit.</th>
            <th className="p-2 text-center">Qtde × Unid.</th>
            <th className="p-2 text-right border-r">V. Total</th>
            <th className="p-2 text-center border-r"></th>
            <th className="p-2 text-left">Especificação</th>
            <th className="p-2 text-right">V. Unit.</th>
            <th className="p-2 text-center">Qtde × Unid.</th>
            <th className="p-2 text-right border-r">V. Total</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {isEmpty && (
            <tr>
              <td colSpan={11} className="p-8 text-center text-muted-foreground text-sm">
                <p className="mb-3">Nenhum item cadastrado ainda.</p>
                <p className="text-xs mb-4">Use <span className="font-medium">"Importar PT"</span> no painel de orientação acima para carregar todos os itens da planilha CEAP de uma vez, ou adicione um item manualmente:</p>
                <Button size="sm" onClick={() => addNewLine('META 1')} className="gap-1">
                  <PlusCircle className="w-4 h-4" /> Adicionar primeiro item
                </Button>
              </td>
            </tr>
          )}
          {groups.map(([metaGroup, groupItems]) => (
            <React.Fragment key={metaGroup}>
              <tr className="bg-muted/30">
                <td colSpan={11} className="p-2 font-semibold text-sm">
                  {metaGroup}
                  <Button
                    size="sm" variant="ghost"
                    className="ml-3 h-6 text-xs gap-1"
                    onClick={() => addNewLine(metaGroup)}
                  >
                    <PlusCircle className="w-3 h-3" /> Adicionar item novo nesta meta
                  </Button>
                </td>
              </tr>
              {groupItems.map(item => {
                const proposal = getValue(item, 'proposal') as Proposal;
                const isNew = item.is_new_item;
                const isManter = proposal === 'manter' && !isNew;
                const isExcluir = proposal === 'excluir' && !isNew;
                const isAlterar = proposal === 'alterar' || isNew;
                const isExpanded = expanded.has(item.id);
                const warn = getWarning(item);

                const rowBg = isExcluir
                  ? 'bg-red-50/50 dark:bg-red-900/10'
                  : isAlterar
                    ? 'bg-blue-50/30 dark:bg-blue-900/10'
                    : '';

                return (
                  <React.Fragment key={item.id}>
                    <tr className={cn('border-t hover:bg-accent/30', rowBg)}>
                      <td className="p-1 align-top">
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => setExpanded(s => {
                            const n = new Set(s);
                            n.has(item.id) ? n.delete(item.id) : n.add(item.id);
                            return n;
                          })}
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </Button>
                      </td>

                      {/* DE */}
                      {isNew ? (
                        <>
                          <td className="p-2 align-top text-muted-foreground italic" colSpan={4}>
                            <Badge variant="outline" className="text-primary border-primary mr-2">NOVO</Badge>
                            Item adicionado ao orçamento
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2 align-top">
                            <span className="font-medium">{item.item_number}</span>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{item.specification}</p>
                          </td>
                          <td className="p-2 align-top text-right tabular-nums">{fmt(Number(item.original_unit_value))}</td>
                          <td className="p-2 align-top text-center">{item.original_quantity} {item.original_unit_measure}</td>
                          <td className="p-2 align-top text-right font-medium tabular-nums border-r">{fmt(Number(item.original_total))}</td>
                        </>
                      )}

                      {/* PROPOSTA */}
                      <td className="p-1 align-top text-center border-r">
                        {isNew ? (
                          <Badge className="bg-primary text-primary-foreground">NOVO</Badge>
                        ) : (
                          <Select value={proposal} onValueChange={v => handleProposalChange(item, v as Proposal)}>
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manter">✅ Manter</SelectItem>
                              <SelectItem value="alterar">🔄 Alterar</SelectItem>
                              <SelectItem value="excluir">❌ Excluir</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>

                      {/* PARA */}
                      <td className="p-1 align-top">
                        <Input
                          value={getValue(item, 'new_specification') as string || ''}
                          onChange={e => queueSave(item.id, { new_specification: e.target.value } as any)}
                          disabled={isManter || isExcluir}
                          placeholder={isExcluir ? '—' : 'Especificação'}
                          className="h-7 text-xs"
                        />
                      </td>
                      <td className="p-1 align-top">
                        <Input
                          type="number"
                          value={getValue(item, 'new_unit_value') as number || ''}
                          onChange={e => handleNewValueChange(item, 'new_unit_value', e.target.value)}
                          disabled={isManter || isExcluir}
                          className="h-7 text-xs text-right tabular-nums w-[90px]"
                        />
                      </td>
                      <td className="p-1 align-top">
                        <div className="flex gap-1 items-center">
                          <Input
                            type="number"
                            value={getValue(item, 'new_quantity') as number || ''}
                            onChange={e => handleNewValueChange(item, 'new_quantity', e.target.value)}
                            disabled={isManter || isExcluir}
                            className="h-7 text-xs w-[60px] text-center"
                          />
                          <Input
                            value={getValue(item, 'new_unit_measure') as string || ''}
                            onChange={e => queueSave(item.id, { new_unit_measure: e.target.value } as any)}
                            disabled={isManter || isExcluir}
                            placeholder="Mês"
                            className="h-7 text-xs w-[60px]"
                          />
                        </div>
                      </td>
                      <td className="p-1 align-top text-right font-medium tabular-nums border-r whitespace-nowrap">
                        {isExcluir ? '—' : fmt(Number(getValue(item, 'new_total')))}
                      </td>

                      {/* Ações */}
                      <td className="p-1 align-top">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => onDeleteItem(item.id)}
                          title="Excluir linha"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>

                    {/* Linha expandida: justificativa + parâmetros + descrição */}
                    {(isExpanded || isAlterar || isExcluir) && (
                      <tr className={cn('border-t', rowBg)}>
                        <td></td>
                        <td colSpan={10} className="p-3 space-y-2">
                          {warn && (
                            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{warn}</span>
                            </div>
                          )}

                          {item.executed_amount > 0 && !warn && (
                            <p className="text-[11px] text-muted-foreground">
                              Já executado: <span className="font-medium">{fmt(Number(item.executed_amount))}</span>
                            </p>
                          )}

                          {item.description && (
                            <p className="text-[11px] text-muted-foreground italic line-clamp-3">{item.description}</p>
                          )}

                          {/* Justificativa para alterar/excluir/novo */}
                          {(isAlterar || isExcluir) && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-medium">
                                  Justificativa {isExcluir ? 'da exclusão' : isNew ? 'do novo item' : 'da alteração'} *
                                </label>
                                <Button
                                  size="sm" variant="outline"
                                  className="h-6 gap-1 text-[10px]"
                                  disabled={generatingAI === item.id}
                                  onClick={() => generateAI(item)}
                                >
                                  {generatingAI === item.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Sparkles className="w-3 h-3" />}
                                  IA
                                </Button>
                              </div>
                              <Textarea
                                value={getValue(item, 'justification') as string || ''}
                                onChange={e => queueSave(item.id, { justification: e.target.value } as any)}
                                rows={2}
                                placeholder="Justificativa detalhada..."
                                className="text-xs"
                              />
                            </div>
                          )}

                          {/* Parâmetros de preço para alterar/novo */}
                          {isAlterar && (
                            <div>
                              <p className="text-[11px] font-medium mb-1">Parâmetros de preço (3 orçamentos) *</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map(n => (
                                  <div key={n} className="flex gap-1">
                                    <Input
                                      placeholder={`Fonte ${n}`}
                                      value={(getValue(item, `price_ref_${n}` as any) as string) || ''}
                                      onChange={e => handlePriceRefChange(item, n as 1|2|3, 'name', e.target.value)}
                                      className="h-7 text-[11px]"
                                    />
                                    <Input
                                      type="number"
                                      placeholder="R$"
                                      value={(getValue(item, `price_ref_${n}_value` as any) as number) || ''}
                                      onChange={e => handlePriceRefChange(item, n as 1|2|3, 'value', e.target.value)}
                                      className="h-7 text-[11px] w-[80px] text-right"
                                    />
                                  </div>
                                ))}
                              </div>
                              {Number(getValue(item, 'price_average')) > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Média: <span className="font-medium">{fmt(Number(getValue(item, 'price_average')))}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
