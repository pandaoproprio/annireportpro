import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { FIELD_TYPE_LABELS, type Form, type FormField } from '../types';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFormId: string;
  onImport: (fields: Array<Partial<FormField> & { form_id: string }>) => Promise<void>;
  currentFieldCount: number;
}

export const ImportFieldsDialog: React.FC<Props> = ({ open, onOpenChange, currentFormId, onImport, currentFieldCount }) => {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const formsQuery = useQuery({
    queryKey: ['gira-forms-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, category, status')
        .neq('id', currentFormId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Pick<Form, 'id' | 'title' | 'category' | 'status'>[];
    },
    enabled: open,
  });

  const fieldsQuery = useQuery({
    queryKey: ['gira-form-fields-import', selectedFormId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', selectedFormId!)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as FormField[];
    },
    enabled: !!selectedFormId,
  });

  const toggleField = (id: string) => {
    setSelectedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allFields = fieldsQuery.data || [];
    if (selectedFieldIds.size === allFields.length) {
      setSelectedFieldIds(new Set());
    } else {
      setSelectedFieldIds(new Set(allFields.map(f => f.id)));
    }
  };

  const handleImport = async () => {
    const sourceFields = (fieldsQuery.data || []).filter(f => selectedFieldIds.has(f.id));
    if (sourceFields.length === 0) return;

    setImporting(true);
    try {
      const fieldsToImport = sourceFields.map((f, i) => ({
        form_id: currentFormId,
        type: f.type,
        label: f.label,
        description: f.description,
        required: f.required,
        options: f.options,
        sort_order: currentFieldCount + i,
        settings: f.settings,
      }));
      await onImport(fieldsToImport);
      toast.success(`${sourceFields.length} campo(s) importado(s)!`);
      onOpenChange(false);
      setSelectedFormId(null);
      setSelectedFieldIds(new Set());
    } catch {
      toast.error('Erro ao importar campos');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    setSelectedFormId(null);
    setSelectedFieldIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedFormId && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Download className="w-5 h-5 text-primary" />
            {selectedFormId ? 'Selecionar Campos' : 'Importar Campos'}
          </DialogTitle>
          <DialogDescription>
            {selectedFormId
              ? 'Marque os campos que deseja copiar para este formulário.'
              : 'Escolha o formulário de origem para importar campos.'}
          </DialogDescription>
        </DialogHeader>

        {!selectedFormId ? (
          <ScrollArea className="max-h-[400px]">
            {formsQuery.isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (formsQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum outro formulário encontrado.</p>
            ) : (
              <div className="space-y-1 p-1">
                {(formsQuery.data || []).map(form => (
                  <button
                    key={form.id}
                    onClick={() => setSelectedFormId(form.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{form.title}</p>
                      <p className="text-xs text-muted-foreground">{form.category}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {form.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="max-h-[350px]">
              {fieldsQuery.isLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (fieldsQuery.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Este formulário não possui campos.</p>
              ) : (
                <div className="space-y-1 p-1">
                  <button
                    onClick={toggleAll}
                    className="w-full text-left text-xs text-primary font-medium px-3 py-1.5 hover:underline"
                  >
                    {selectedFieldIds.size === (fieldsQuery.data || []).length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  {(fieldsQuery.data || []).map(field => (
                    <label
                      key={field.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedFieldIds.has(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{field.label}</p>
                        {field.description && (
                          <p className="text-xs text-muted-foreground truncate">{field.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {FIELD_TYPE_LABELS[field.type] || field.type}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={selectedFieldIds.size === 0 || importing}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Importar {selectedFieldIds.size > 0 ? `(${selectedFieldIds.size})` : ''}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
