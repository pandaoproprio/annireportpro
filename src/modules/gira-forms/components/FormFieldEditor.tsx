import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, ChevronDown, ChevronUp, PlusCircle, X, SeparatorHorizontal, Info, GitBranch, ArrowUp, ArrowDown, Sparkles, Copy } from 'lucide-react';
import { FIELD_TYPE_LABELS, type FormField, type FieldType, type FieldCondition, type FieldConditionGroup } from '../types';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  field: FormField;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<FormField>) => Promise<void>;
  onDelete: () => void;
  allFields?: FormField[];
}

const NON_INPUT_TYPES: FieldType[] = ['section_header', 'info_text'];
const OTHER_SENTINEL = '__other__';

const CONDITION_OPERATORS: { value: FieldCondition['operator']; label: string }[] = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'É diferente de' },
  { value: 'contains', label: 'Contém' },
  { value: 'not_contains', label: 'Não contém' },
  { value: 'starts_with', label: 'Começa com' },
  { value: 'ends_with', label: 'Termina com' },
  { value: 'in_list', label: 'É um destes (separe por vírgula)' },
  { value: 'not_in_list', label: 'Não é nenhum destes (vírgula)' },
  { value: 'greater_than', label: 'Maior que (número)' },
  { value: 'less_than', label: 'Menor que (número)' },
  { value: 'not_empty', label: 'Está preenchido' },
  { value: 'is_empty', label: 'Está vazio' },
];

function parseLegacyCondition(raw: unknown): FieldConditionGroup | null {
  if (!raw) return null;
  if ((raw as any).conditions) return raw as FieldConditionGroup;
  if ((raw as any).field_id) return { logic: 'AND', conditions: [raw as FieldCondition] };
  return null;
}

type OptionItem = { uid: string; kind: 'option' | 'other'; value: string };

let __optionUidCounter = 0;
const nextUid = () => `opt-${Date.now()}-${++__optionUidCounter}`;

/**
 * Constrói a lista editável de opções a partir de field.options + settings.
 * - Se `__other__` aparecer em options, ele define a posição da opção "Outros".
 * - Caso contrário e allowOther=true, usa o legado settings.otherPosition ('start'|'end').
 */
function buildItems(rawOptions: string[], allowOther: boolean, legacyPosition: 'start' | 'end' | undefined): OptionItem[] {
  const items: OptionItem[] = [];
  const hasInlineOther = rawOptions.includes(OTHER_SENTINEL);

  if (hasInlineOther) {
    rawOptions.forEach(opt => {
      if (opt === OTHER_SENTINEL) {
        items.push({ uid: nextUid(), kind: 'other', value: 'Outros (especifique)' });
      } else {
        items.push({ uid: nextUid(), kind: 'option', value: opt });
      }
    });
  } else {
    rawOptions.forEach(opt => items.push({ uid: nextUid(), kind: 'option', value: opt }));
    if (allowOther) {
      const otherItem: OptionItem = { uid: nextUid(), kind: 'other', value: 'Outros (especifique)' };
      if (legacyPosition === 'start') items.unshift(otherItem);
      else items.push(otherItem);
    }
  }
  return items;
}

function serializeItems(items: OptionItem[]): string[] {
  return items.map(it => (it.kind === 'other' ? OTHER_SENTINEL : it.value));
}

interface SortableOptionRowProps {
  item: OptionItem;
  index: number;
  total: number;
  onChangeValue: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const SortableOptionRow: React.FC<SortableOptionRowProps> = ({
  item, index, total, onChangeValue, onMoveUp, onMoveDown, onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 6px 16px hsl(var(--foreground) / 0.15)' : undefined,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  };
  const isOther = item.kind === 'other';

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1 rounded-md ${isOther ? 'bg-accent/40 border border-accent' : 'bg-background'}`}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing px-1 py-2 text-muted-foreground hover:text-foreground touch-none"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {isOther ? (
        <div className="flex-1 h-8 flex items-center gap-2 px-2 text-sm">
          <Sparkles className="w-3 h-3 text-accent-foreground" />
          <span className="text-foreground">Outros (especifique)</span>
          <span className="text-[10px] uppercase tracking-wide bg-accent text-accent-foreground rounded px-1.5 py-0.5">Especial</span>
        </div>
      ) : (
        <Input
          value={item.value}
          onChange={e => onChangeValue(e.target.value)}
          className="h-8 text-sm border-0 focus-visible:ring-1"
          placeholder={`Opção ${index + 1}`}
        />
      )}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        disabled={index === 0}
        onClick={onMoveUp}
        aria-label="Subir"
        title="Subir"
      >
        <ArrowUp className="w-3 h-3" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        disabled={index === total - 1}
        onClick={onMoveDown}
        aria-label="Descer"
        title="Descer"
      >
        <ArrowDown className="w-3 h-3" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-destructive"
        onClick={onRemove}
        aria-label="Remover"
        title="Remover"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

export const FormFieldEditor: React.FC<Props> = ({ field, isEditing, onToggleEdit, onUpdate, onDelete, allFields = [] }) => {
  const [label, setLabel] = useState(field.label);
  const [description, setDescription] = useState(field.description);
  const [required, setRequired] = useState(field.required);
  const [type, setType] = useState<FieldType>(field.type as FieldType);

  // Estado unificado: lista ordenada de itens (opções + "Outros" inline).
  const [items, setItems] = useState<OptionItem[]>(() =>
    buildItems(
      field.options || [],
      !!field.settings?.allowOther,
      (field.settings?.otherPosition as 'start' | 'end' | undefined),
    )
  );

  const [conditionGroup, setConditionGroup] = useState<FieldConditionGroup | null>(
    () => parseLegacyCondition(field.settings?.condition)
  );

  const hasOptions = ['single_select', 'multi_select', 'checkbox'].includes(type);
  const isNonInput = NON_INPUT_TYPES.includes(type);
  const allowOther = useMemo(() => items.some(i => i.kind === 'other'), [items]);

  const conditionSourceFields = allFields.filter(
    f => f.sort_order < field.sort_order && !NON_INPUT_TYPES.includes(f.type as FieldType)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSave = async () => {
    const newSettings = { ...field.settings };
    if (conditionGroup && conditionGroup.conditions.length > 0 && conditionGroup.conditions.some(c => c.field_id)) {
      newSettings.condition = conditionGroup;
    } else {
      delete newSettings.condition;
    }
    if (hasOptions) {
      newSettings.allowOther = allowOther;
      // otherPosition é legado — mantemos para compatibilidade, mas a posição real
      // vem da própria ordem de `options` (com sentinela __other__).
      delete newSettings.otherPosition;
    }
    const serialized = hasOptions ? serializeItems(items) : (field.options || []);
    await onUpdate({
      label,
      description,
      required: isNonInput ? false : required,
      type,
      options: serialized,
      settings: newSettings,
    });
    onToggleEdit();
  };

  React.useEffect(() => {
    setLabel(field.label);
    setDescription(field.description);
    setRequired(field.required);
    setType(field.type as FieldType);
    setItems(buildItems(
      field.options || [],
      !!field.settings?.allowOther,
      (field.settings?.otherPosition as 'start' | 'end' | undefined),
    ));
    setConditionGroup(parseLegacyCondition(field.settings?.condition));
  }, [field]);

  const getIcon = () => {
    if (type === 'section_header') return <SeparatorHorizontal className="w-4 h-4 text-primary" />;
    if (type === 'info_text') return <Info className="w-4 h-4 text-primary" />;
    return null;
  };

  const hasCondition = !!(parseLegacyCondition(field.settings?.condition))?.conditions?.some(c => c.field_id);

  const updateCondition = (index: number, updates: Partial<FieldCondition>) => {
    if (!conditionGroup) return;
    const next = [...conditionGroup.conditions];
    next[index] = { ...next[index], ...updates };
    setConditionGroup({ ...conditionGroup, conditions: next });
  };

  const addCondition = () => {
    if (!conditionGroup) {
      setConditionGroup({ logic: 'AND', conditions: [{ field_id: '', operator: 'equals', value: '' }] });
    } else {
      setConditionGroup({ ...conditionGroup, conditions: [...conditionGroup.conditions, { field_id: '', operator: 'equals', value: '' }] });
    }
  };

  const removeCondition = (index: number) => {
    if (!conditionGroup) return;
    const next = conditionGroup.conditions.filter((_, i) => i !== index);
    if (next.length === 0) setConditionGroup(null);
    else setConditionGroup({ ...conditionGroup, conditions: next });
  };

  // ---------- Manipulação dos itens (opções + Outros) ----------
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.uid === active.id);
    const newIndex = items.findIndex(i => i.uid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setItems(arrayMove(items, oldIndex, newIndex));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    setItems(arrayMove(items, index, newIndex));
  };

  const updateItemValue = (index: number, value: string) => {
    setItems(items.map((it, i) => (i === index ? { ...it, value } : it)));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addOption = () => {
    setItems([...items, { uid: nextUid(), kind: 'option', value: '' }]);
  };

  const toggleAllowOther = (checked: boolean) => {
    if (checked) {
      if (items.some(i => i.kind === 'other')) return;
      setItems([...items, { uid: nextUid(), kind: 'other', value: 'Outros (especifique)' }]);
    } else {
      setItems(items.filter(i => i.kind !== 'other'));
    }
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
                  {hasCondition && (
                    <span className="text-xs text-accent-foreground bg-accent px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <GitBranch className="w-3 h-3" /> Condicional
                    </span>
                  )}
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
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-1">
                      Arraste pelo ícone <GripVertical className="inline w-3 h-3 align-text-bottom" /> ou use as setas para reordenar.
                    </p>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={items.map(i => i.uid)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1.5 mt-1">
                          {items.map((item, i) => (
                            <SortableOptionRow
                              key={item.uid}
                              item={item}
                              index={i}
                              total={items.length}
                              onChangeValue={(v) => updateItemValue(i, v)}
                              onMoveUp={() => moveItem(i, -1)}
                              onMoveDown={() => moveItem(i, 1)}
                              onRemove={() => removeItem(i)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <Button variant="ghost" size="sm" className="text-xs gap-1 mt-1.5" onClick={addOption}>
                      <PlusCircle className="w-3 h-3" /> Adicionar opção
                    </Button>

                    <div className="flex items-center gap-2 mt-3">
                      <Switch
                        checked={allowOther}
                        onCheckedChange={toggleAllowOther}
                      />
                      <Label className="text-xs">Incluir opção "Outros (especifique)"</Label>
                    </div>
                    {allowOther && (
                      <p className="text-[11px] text-muted-foreground mt-1 pl-9">
                        Reordene a opção "Outros" arrastando-a ou usando as setas, como qualquer outra.
                      </p>
                    )}
                  </div>
                )}

                {!isNonInput && (
                  <div className="flex items-center gap-2">
                    <Switch checked={required} onCheckedChange={setRequired} />
                    <Label className="text-xs">Obrigatório</Label>
                  </div>
                )}

                {/* Conditional Logic - Multiple conditions with AND/OR */}
                {conditionSourceFields.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-2 bg-accent/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5 text-primary" /> Lógica Condicional
                      </Label>
                      {conditionGroup ? (
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => setConditionGroup(null)}>
                          Remover tudo
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={addCondition}>
                          Adicionar
                        </Button>
                      )}
                    </div>
                    {conditionGroup && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Quando verdadeiro:</Label>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={(conditionGroup.action ?? 'show') === 'show' ? 'default' : 'outline'}
                              className="h-6 text-xs px-2"
                              onClick={() => setConditionGroup({ ...conditionGroup, action: 'show' })}
                            >
                              Mostrar campo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={conditionGroup.action === 'hide' ? 'default' : 'outline'}
                              className="h-6 text-xs px-2"
                              onClick={() => setConditionGroup({ ...conditionGroup, action: 'hide' })}
                            >
                              Ocultar campo
                            </Button>
                          </div>
                        </div>
                        {conditionGroup.conditions.length > 1 && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Combinar com:</Label>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={conditionGroup.logic === 'AND' ? 'default' : 'outline'}
                                className="h-6 text-xs px-2"
                                onClick={() => setConditionGroup({ ...conditionGroup, logic: 'AND' })}
                              >
                                E (todas)
                              </Button>
                              <Button
                                size="sm"
                                variant={conditionGroup.logic === 'OR' ? 'default' : 'outline'}
                                className="h-6 text-xs px-2"
                                onClick={() => setConditionGroup({ ...conditionGroup, logic: 'OR' })}
                              >
                                OU (qualquer)
                              </Button>
                            </div>
                          </div>
                        )}

                        {conditionGroup.conditions.map((cond, idx) => {
                          const sourceField = conditionSourceFields.find(f => f.id === cond.field_id);
                          const sourceOptions = (sourceField?.options || []).filter(o => o !== OTHER_SENTINEL);
                          const needsValue = cond.operator && !['not_empty', 'is_empty'].includes(cond.operator);

                          return (
                            <div key={idx} className="space-y-1.5 border rounded p-2 bg-background relative">
                              {idx > 0 && (
                                <div className="absolute -top-3 left-3 bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                  {conditionGroup.logic === 'AND' ? 'E' : 'OU'}
                                </div>
                              )}
                              <div className="flex items-start gap-1">
                                <div className="flex-1 space-y-1.5">
                                  <Select value={cond.field_id} onValueChange={v => updateCondition(idx, { field_id: v, value: '' })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um campo..." /></SelectTrigger>
                                    <SelectContent>
                                      {conditionSourceFields.map(f => (
                                        <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={cond.operator} onValueChange={v => updateCondition(idx, { operator: v as FieldCondition['operator'] })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {CONDITION_OPERATORS.map(op => (
                                        <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {needsValue && (
                                    sourceOptions.length > 0 ? (
                                      <Select value={cond.value || ''} onValueChange={v => updateCondition(idx, { value: v })}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o valor..." /></SelectTrigger>
                                        <SelectContent>
                                          {sourceOptions.map((opt, i) => (
                                            <SelectItem key={i} value={opt} className="text-xs">{opt}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        value={cond.value || ''}
                                        onChange={e => updateCondition(idx, { value: e.target.value })}
                                        placeholder="Valor esperado"
                                        className="h-8 text-xs"
                                      />
                                    )
                                  )}
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeCondition(idx)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addCondition}>
                          <PlusCircle className="w-3 h-3" /> Adicionar condição
                        </Button>
                      </div>
                    )}
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
