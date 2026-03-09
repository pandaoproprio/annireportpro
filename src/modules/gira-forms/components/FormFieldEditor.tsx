import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, ChevronDown, ChevronUp, PlusCircle, X, SeparatorHorizontal, Info } from 'lucide-react';
import { FIELD_TYPE_LABELS, type FormField, type FieldType } from '../types';

interface Props {
  field: FormField;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<FormField>) => Promise<void>;
  onDelete: () => void;
}

const NON_INPUT_TYPES: FieldType[] = ['section_header', 'info_text'];

export const FormFieldEditor: React.FC<Props> = ({ field, isEditing, onToggleEdit, onUpdate, onDelete }) => {
  const [label, setLabel] = useState(field.label);
  const [description, setDescription] = useState(field.description);
  const [required, setRequired] = useState(field.required);
  const [type, setType] = useState<FieldType>(field.type as FieldType);
  const [options, setOptions] = useState<string[]>(field.options || []);

  const hasOptions = ['single_select', 'multi_select', 'checkbox'].includes(type);
  const isNonInput = NON_INPUT_TYPES.includes(type);

  const handleSave = async () => {
    await onUpdate({ label, description, required: isNonInput ? false : required, type, options });
    onToggleEdit();
  };

  React.useEffect(() => {
    setLabel(field.label);
    setDescription(field.description);
    setRequired(field.required);
    setType(field.type as FieldType);
    setOptions(field.options || []);
  }, [field]);

  const getIcon = () => {
    if (type === 'section_header') return <SeparatorHorizontal className="w-4 h-4 text-primary" />;
    if (type === 'info_text') return <Info className="w-4 h-4 text-blue-500" />;
    return null;
  };

  return (
    <Card className={`transition-all ${isEditing ? 'ring-2 ring-primary/30' : 'hover:shadow-sm'} ${isNonInput ? 'border-l-4 border-l-primary/40' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="cursor-grab pt-1 text-muted-foreground hover:text-foreground">
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {!isEditing ? (
              <div className="cursor-pointer" onClick={onToggleEdit}>
                <div className="flex items-center gap-2">
                  {getIcon()}
                  <span className="font-medium text-sm">{label || 'Sem título'}</span>
                  {required && !isNonInput && <span className="text-destructive text-xs">*</span>}
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{FIELD_TYPE_LABELS[type]}</span>
                </div>
                {description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{type === 'section_header' ? 'Título da Seção' : type === 'info_text' ? 'Título do Bloco' : 'Título do Campo'}</Label>
                  <Input value={label} onChange={e => setLabel(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">{type === 'info_text' ? 'Conteúdo (use **texto** para negrito)' : 'Descrição'}</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={type === 'info_text' ? 6 : 2} className="mt-1 resize-none" />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={type} onValueChange={v => setType(v as FieldType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(FIELD_TYPE_LABELS)).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasOptions && (
                  <div>
                    <Label className="text-xs">Opções</Label>
                    <div className="space-y-1.5 mt-1">
                      {options.map((opt, i) => (
                        <div key={i} className="flex gap-1">
                          <Input
                            value={opt}
                            onChange={e => {
                              const next = [...options];
                              next[i] = e.target.value;
                              setOptions(next);
                            }}
                            className="h-8 text-sm"
                            placeholder={`Opção ${i + 1}`}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setOptions([...options, ''])}>
                        <PlusCircle className="w-3 h-3" /> Adicionar opção
                      </Button>
                    </div>
                  </div>
                )}

                {!isNonInput && (
                  <div className="flex items-center gap-2">
                    <Switch checked={required} onCheckedChange={setRequired} />
                    <Label className="text-xs">Obrigatório</Label>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" onClick={handleSave}>Salvar</Button>
                  <Button size="sm" variant="outline" onClick={onToggleEdit}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggleEdit}>
              {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
