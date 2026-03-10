import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BudgetLine {
  id: string;
  project_id: string;
  user_id: string;
  category: string;
  description: string;
  planned_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  project_id: string;
  user_id: string;
  budget_line_id: string | null;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  activity_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type BudgetLineForm = { category: string; description: string; planned_amount: string };
export type ExpenseForm = { category: string; description: string; amount: string; expense_date: string; notes: string; budget_line_id: string };

export const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  pessoal: 'Pessoal',
  material: 'Material',
  servicos: 'Serviços',
  infraestrutura: 'Infraestrutura',
  comunicacao: 'Comunicação',
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  capacitacao: 'Capacitação',
  equipamentos: 'Equipamentos',
  outros: 'Outros',
};

export interface CategorySummary {
  category: string;
  label: string;
  planned: number;
  executed: number;
  balance: number;
  percentage: number;
}

export function useProjectBudget(projectId: string | undefined) {
  const { user } = useAuth();
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!projectId) { setBudgetLines([]); setExpenses([]); setIsLoading(false); return; }
    setIsLoading(true);

    const [blRes, exRes] = await Promise.all([
      supabase.from('project_budget_lines' as any).select('*').eq('project_id', projectId).order('category'),
      supabase.from('project_expenses' as any).select('*').eq('project_id', projectId).order('expense_date', { ascending: false }),
    ]);

    if (blRes.error) console.error('budget lines error:', blRes.error);
    if (exRes.error) console.error('expenses error:', exRes.error);

    setBudgetLines((blRes.data || []) as unknown as BudgetLine[]);
    setExpenses((exRes.data || []) as unknown as Expense[]);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Budget Line CRUD
  const createBudgetLine = async (form: BudgetLineForm) => {
    if (!projectId || !user) return false;
    const { error } = await supabase.from('project_budget_lines' as any).insert({
      project_id: projectId, user_id: user.id,
      category: form.category, description: form.description,
      planned_amount: parseFloat(form.planned_amount) || 0,
    } as any);
    if (error) { toast.error('Erro ao criar linha orçamentária'); return false; }
    toast.success('Linha orçamentária criada');
    fetchAll();
    return true;
  };

  const updateBudgetLine = async (id: string, form: BudgetLineForm) => {
    const { error } = await supabase.from('project_budget_lines' as any).update({
      category: form.category, description: form.description,
      planned_amount: parseFloat(form.planned_amount) || 0,
    } as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return false; }
    toast.success('Atualizado'); fetchAll(); return true;
  };

  const deleteBudgetLine = async (id: string) => {
    const { error } = await supabase.from('project_budget_lines' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return false; }
    toast.success('Linha excluída'); fetchAll(); return true;
  };

  // Expense CRUD
  const createExpense = async (form: ExpenseForm) => {
    if (!projectId || !user) return false;
    const { error } = await supabase.from('project_expenses' as any).insert({
      project_id: projectId, user_id: user.id,
      category: form.category, description: form.description,
      amount: parseFloat(form.amount) || 0,
      expense_date: form.expense_date || new Date().toISOString().split('T')[0],
      notes: form.notes,
      budget_line_id: form.budget_line_id || null,
    } as any);
    if (error) { toast.error('Erro ao registrar despesa'); return false; }
    toast.success('Despesa registrada');
    fetchAll();
    return true;
  };

  const updateExpense = async (id: string, form: Partial<ExpenseForm>) => {
    const updates: any = {};
    if (form.category) updates.category = form.category;
    if (form.description !== undefined) updates.description = form.description;
    if (form.amount) updates.amount = parseFloat(form.amount) || 0;
    if (form.expense_date) updates.expense_date = form.expense_date;
    if (form.notes !== undefined) updates.notes = form.notes;
    const { error } = await supabase.from('project_expenses' as any).update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar despesa'); return false; }
    toast.success('Despesa atualizada'); fetchAll(); return true;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('project_expenses' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir despesa'); return false; }
    toast.success('Despesa excluída'); fetchAll(); return true;
  };

  // Aggregations
  const totalPlanned = budgetLines.reduce((s, b) => s + Number(b.planned_amount), 0);
  const totalExecuted = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalBalance = totalPlanned - totalExecuted;
  const executionRate = totalPlanned > 0 ? (totalExecuted / totalPlanned) * 100 : 0;

  const categorySummaries: CategorySummary[] = Object.keys(BUDGET_CATEGORY_LABELS).map(cat => {
    const planned = budgetLines.filter(b => b.category === cat).reduce((s, b) => s + Number(b.planned_amount), 0);
    const executed = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
    return {
      category: cat,
      label: BUDGET_CATEGORY_LABELS[cat],
      planned,
      executed,
      balance: planned - executed,
      percentage: planned > 0 ? (executed / planned) * 100 : executed > 0 ? 100 : 0,
    };
  }).filter(c => c.planned > 0 || c.executed > 0);

  return {
    budgetLines, expenses, isLoading,
    createBudgetLine, updateBudgetLine, deleteBudgetLine,
    createExpense, updateExpense, deleteExpense,
    fetchAll,
    totalPlanned, totalExecuted, totalBalance, executionRate,
    categorySummaries,
  };
}
