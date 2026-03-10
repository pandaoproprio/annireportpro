import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BUDGET_CATEGORY_LABELS, ExpenseForm, BudgetLine } from '@/hooks/useProjectBudget';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseForm) => Promise<boolean>;
  budgetLines: BudgetLine[];
  initialData?: Partial<ExpenseForm>;
  isEdit?: boolean;
}

export const ExpenseDialog: React.FC<ExpenseDialogProps> = ({
  open, onOpenChange, onSubmit, budgetLines, initialData, isEdit
}) => {
  const [form, setForm] = useState<ExpenseForm>({
    category: initialData?.category || 'outros',
    description: initialData?.description || '',
    amount: initialData?.amount || '',
    expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0],
    notes: initialData?.notes || '',
    budget_line_id: initialData?.budget_line_id || '',
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setForm({
      category: initialData?.category || 'outros',
      description: initialData?.description || '',
      amount: initialData?.amount || '',
      expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0],
      notes: initialData?.notes || '',
      budget_line_id: initialData?.budget_line_id || '',
    });
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Despesa' : 'Registrar Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BUDGET_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {budgetLines.length > 0 && (
            <div>
              <Label>Linha Orçamentária (opcional)</Label>
              <Select value={form.budget_line_id} onValueChange={v => setForm(f => ({ ...f, budget_line_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vincular a uma linha..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {budgetLines.map(bl => (
                    <SelectItem key={bl.id} value={bl.id}>
                      {BUDGET_CATEGORY_LABELS[bl.category]} — {bl.description || 'Sem descrição'} (R$ {Number(bl.planned_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Compra de materiais para oficina" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas adicionais..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.description.trim() || !form.amount}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
