import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BudgetAdjustment {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: 'rascunho' | 'em_analise' | 'aprovado' | 'devolvido';
  ra_balance: number;
  ra_justification: string;
  ra_schedule: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetAdjustmentItem {
  id: string;
  adjustment_id: string;
  item_number: string;
  specification: string;
  description: string;
  original_unit_value: number;
  original_unit_measure: string;
  original_quantity: number;
  original_total: number;
  executed_amount: number;
  proposal: 'manter' | 'alterar' | 'excluir';
  new_specification: string;
  new_unit_value: number;
  new_unit_measure: string;
  new_quantity: number;
  new_total: number;
  justification: string;
  price_ref_1: string;
  price_ref_1_value: number;
  price_ref_2: string;
  price_ref_2_value: number;
  price_ref_3: string;
  price_ref_3_value: number;
  price_average: number;
  meta_group: string;
  sort_order: number;
  is_new_item: boolean;
  created_at: string;
  updated_at: string;
}

export type AdjustmentItemForm = Omit<BudgetAdjustmentItem, 'id' | 'adjustment_id' | 'created_at' | 'updated_at'>;

export function useBudgetAdjustments(projectId: string | undefined) {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<BudgetAdjustment[]>([]);
  const [activeAdjustment, setActiveAdjustment] = useState<BudgetAdjustment | null>(null);
  const [items, setItems] = useState<BudgetAdjustmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdjustments = useCallback(async () => {
    if (!projectId) { setAdjustments([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('budget_adjustments' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) console.error('adjustments error:', error);
    setAdjustments((data || []) as unknown as BudgetAdjustment[]);
    setIsLoading(false);
  }, [projectId]);

  const fetchItems = useCallback(async (adjustmentId: string) => {
    const { data, error } = await supabase
      .from('budget_adjustment_items' as any)
      .select('*')
      .eq('adjustment_id', adjustmentId)
      .order('sort_order');
    if (error) console.error('items error:', error);
    setItems((data || []) as unknown as BudgetAdjustmentItem[]);
  }, []);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  useEffect(() => {
    if (activeAdjustment) fetchItems(activeAdjustment.id);
    else setItems([]);
  }, [activeAdjustment, fetchItems]);

  const createAdjustment = async (title: string = 'Ajuste de PT') => {
    if (!projectId || !user) return null;
    const { data, error } = await supabase
      .from('budget_adjustments' as any)
      .insert({ project_id: projectId, user_id: user.id, title } as any)
      .select()
      .single();
    if (error) { toast.error('Erro ao criar ajuste'); return null; }
    toast.success('Ajuste criado');
    await fetchAdjustments();
    return data as unknown as BudgetAdjustment;
  };

  const updateAdjustment = async (id: string, updates: Partial<BudgetAdjustment>) => {
    const { error } = await supabase
      .from('budget_adjustments' as any)
      .update(updates as any)
      .eq('id', id);
    if (error) { toast.error('Erro ao atualizar ajuste'); return false; }
    await fetchAdjustments();
    if (activeAdjustment?.id === id) {
      setActiveAdjustment(prev => prev ? { ...prev, ...updates } : prev);
    }
    return true;
  };

  const deleteAdjustment = async (id: string) => {
    const { error } = await supabase
      .from('budget_adjustments' as any)
      .delete()
      .eq('id', id);
    if (error) { toast.error('Erro ao excluir ajuste'); return false; }
    toast.success('Ajuste excluído');
    if (activeAdjustment?.id === id) setActiveAdjustment(null);
    await fetchAdjustments();
    return true;
  };

  const addItem = async (adjustmentId: string, item: Partial<AdjustmentItemForm>) => {
    const { error } = await supabase
      .from('budget_adjustment_items' as any)
      .insert({ adjustment_id: adjustmentId, ...item } as any);
    if (error) { toast.error('Erro ao adicionar item'); return false; }
    await fetchItems(adjustmentId);
    return true;
  };

  const updateItem = async (itemId: string, updates: Partial<AdjustmentItemForm>) => {
    const { error } = await supabase
      .from('budget_adjustment_items' as any)
      .update(updates as any)
      .eq('id', itemId);
    if (error) { toast.error('Erro ao atualizar item'); return false; }
    if (activeAdjustment) await fetchItems(activeAdjustment.id);
    return true;
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('budget_adjustment_items' as any)
      .delete()
      .eq('id', itemId);
    if (error) { toast.error('Erro ao excluir item'); return false; }
    if (activeAdjustment) await fetchItems(activeAdjustment.id);
    return true;
  };

  const originalItems = items.filter(i => !i.is_new_item);
  const newItems = items.filter(i => i.is_new_item);

  const summary = {
    total: items.length,
    mantidos: originalItems.filter(i => i.proposal === 'manter').length,
    alterados: originalItems.filter(i => i.proposal === 'alterar').length,
    excluidos: originalItems.filter(i => i.proposal === 'excluir').length,
    novos: newItems.length,
    originalTotal: originalItems.reduce((s, i) => s + Number(i.original_total), 0),
    newTotal: items.reduce((s, i) => {
      if (i.proposal === 'excluir') return s;
      if (i.proposal === 'alterar' || i.is_new_item) return s + Number(i.new_total);
      return s + Number(i.original_total);
    }, 0),
  };

  return {
    adjustments, activeAdjustment, setActiveAdjustment,
    items, originalItems, newItems, isLoading,
    createAdjustment, updateAdjustment, deleteAdjustment,
    addItem, updateItem, deleteItem,
    fetchItems, summary,
  };
}
