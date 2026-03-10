import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BUDGET_CATEGORY_LABELS, BudgetLineForm } from '@/hooks/useProjectBudget';

interface BudgetLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BudgetLineForm) => Promise<boolean>;
  initialData?: Partial<BudgetLineForm>;
  isEdit?: boolean;
}

export const BudgetLineDialog: React.FC<BudgetLineDialogProps> = ({
  open, onOpenChange, onSubmit, initialData, isEdit
}) => {
  const [form, setForm] = useState<BudgetLineForm>({
    category: initialData?.category || 'outros',
    description: initialData?.description || '',
    planned_amount: initialData?.planned_amount || '',
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setForm({
      category: initialData?.category || 'outros',
      description: initialData?.description || '',
      planned_amount: initialData?.planned_amount || '',
    });
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Linha Orçamentária' : 'Nova Linha Orçamentária'}</DialogTitle>
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
          <div>
            <Label>Descrição</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Salários da equipe técnica" />
          </div>
          <div>
            <Label>Valor Planejado (R$)</Label>
            <Input type="number" step="0.01" min="0" value={form.planned_amount} onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))} placeholder="0,00" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
