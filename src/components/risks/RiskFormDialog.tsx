import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RiskFormData,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS,
} from '@/hooks/useProjectRisks';

interface RiskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RiskFormData) => Promise<boolean | undefined>;
  initialData?: Partial<RiskFormData>;
  isEdit?: boolean;
}

const defaultForm: RiskFormData = {
  title: '',
  description: '',
  category: 'operacional',
  probability: 'media',
  impact: 'moderado',
  status: 'identificado',
  mitigation_plan: '',
  contingency_plan: '',
  responsible: '',
  due_date: '',
};

export const RiskFormDialog: React.FC<RiskFormDialogProps> = ({
  open, onOpenChange, onSubmit, initialData, isEdit,
}) => {
  const [form, setForm] = useState<RiskFormData>({ ...defaultForm, ...initialData });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setForm({ ...defaultForm, ...initialData });
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const set = (key: keyof RiskFormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Risco' : 'Registrar Novo Risco'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Atraso na entrega de materiais" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descreva o risco em detalhes..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Probabilidade</Label>
              <Select value={form.probability} onValueChange={v => set('probability', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROBABILITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impacto</Label>
              <Select value={form.impact} onValueChange={v => set('impact', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Plano de Mitigação</Label>
            <Textarea value={form.mitigation_plan} onChange={e => set('mitigation_plan', e.target.value)} placeholder="Ações para reduzir probabilidade ou impacto..." rows={3} />
          </div>

          <div>
            <Label>Plano de Contingência</Label>
            <Textarea value={form.contingency_plan} onChange={e => set('contingency_plan', e.target.value)} placeholder="O que fazer se o risco se materializar..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <Input value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Nome do responsável" />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Registrar Risco'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
