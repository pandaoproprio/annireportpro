import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ArrowUp, ArrowDown, Trash2, Plus, GripVertical, Eye, EyeOff,
  Type, Image, FileUp, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { TemplateSection, TemplateField } from '@/types/reportTemplate';

interface TemplateStructureEditorProps {
  sections: TemplateSection[];
  onChange: (sections: TemplateSection[]) => void;
}

const fieldTypeLabels: Record<string, string> = {
  rich_text: 'Texto Rico',
  plain_text: 'Texto Simples',
  photo: 'Foto',
  document: 'Documento',
};

const fieldTypeIcons: Record<string, React.ReactNode> = {
  rich_text: <Type className="w-3.5 h-3.5" />,
  plain_text: <Type className="w-3.5 h-3.5" />,
  photo: <Image className="w-3.5 h-3.5" />,
  document: <FileUp className="w-3.5 h-3.5" />,
};

export const TemplateStructureEditor: React.FC<TemplateStructureEditorProps> = ({ sections, onChange }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    newSections.forEach((s, i) => s.order = i);
    onChange(newSections);
  };

  const updateSection = (index: number, updates: Partial<TemplateSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    onChange(newSections);
  };

  const removeSection = (index: number) => {
    if (sections[index].type === 'fixed') return;
    onChange(sections.filter((_, i) => i !== index));
  };

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `custom_${Date.now()}`,
      title: 'Nova Seção',
      key: `custom_${Date.now()}`,
      type: 'custom',
      isVisible: true,
      isRequired: false,
      order: sections.length,
      fields: [
        {
          id: `field_${Date.now()}`,
          type: 'rich_text',
          label: 'Conteúdo',
          isRequired: false,
          allowMultiple: false,
          allowAI: true,
          maxFiles: null,
        },
      ],
    };
    onChange([...sections, newSection]);
  };

  const addField = (sectionIndex: number) => {
    const newSections = [...sections];
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      type: 'rich_text',
      label: 'Novo Campo',
      isRequired: false,
      allowMultiple: false,
      allowAI: false,
      maxFiles: null,
    };
    newSections[sectionIndex].fields = [...newSections[sectionIndex].fields, newField];
    onChange(newSections);
  };

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<TemplateField>) => {
    const newSections = [...sections];
    const fields = [...newSections[sectionIndex].fields];
    fields[fieldIndex] = { ...fields[fieldIndex], ...updates };
    newSections[sectionIndex].fields = fields;
    onChange(newSections);
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
    onChange(newSections);
  };

  const isExpanded = (id: string) => expandedSection === id;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Estrutura do Template</h3>
        <Button variant="outline" size="sm" onClick={addSection}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Seção
        </Button>
      </div>

      {sections.map((section, sIdx) => (
        <Card key={section.id} className={`transition-all ${!section.isVisible ? 'opacity-50' : ''}`}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(sIdx, 'up')} disabled={sIdx === 0}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(sIdx, 'down')} disabled={sIdx === sections.length - 1}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Input
                value={section.title}
                onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                className="flex-1 h-8 text-sm font-medium"
                disabled={section.type === 'fixed' && section.key === 'object'}
              />

              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {section.type === 'fixed' ? 'Fixo' : section.type === 'custom' ? 'Personalizado' : 'Editável'}
              </Badge>

              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => updateSection(sIdx, { isVisible: !section.isVisible })}
              >
                {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </Button>

              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setExpandedSection(isExpanded(section.id) ? null : section.id)}
              >
                {isExpanded(section.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              {section.type !== 'fixed' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSection(sIdx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>

          {isExpanded(section.id) && (
            <CardContent className="pt-0 pb-4 px-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={section.isRequired}
                    onCheckedChange={(checked) => updateSection(sIdx, { isRequired: !!checked })}
                    id={`required-${section.id}`}
                  />
                  <Label htmlFor={`required-${section.id}`} className="text-xs">Obrigatória</Label>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Campos</p>
                {section.fields.map((field, fIdx) => (
                  <div key={field.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    {fieldTypeIcons[field.type]}

                    <Input
                      value={field.label}
                      onChange={(e) => updateField(sIdx, fIdx, { label: e.target.value })}
                      className="h-7 text-xs flex-1"
                      placeholder="Nome do campo"
                    />

                    <Select
                      value={field.type}
                      onValueChange={(v) => updateField(sIdx, fIdx, { type: v as TemplateField['type'] })}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(fieldTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={field.isRequired}
                        onCheckedChange={(checked) => updateField(sIdx, fIdx, { isRequired: !!checked })}
                        title="Obrigatório"
                      />
                      <span className="text-[10px] text-muted-foreground">Obrig.</span>
                    </div>

                    {(field.type === 'photo' || field.type === 'document') && (
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={field.allowMultiple}
                          onCheckedChange={(checked) => updateField(sIdx, fIdx, { allowMultiple: !!checked })}
                          title="Múltiplos"
                        />
                        <span className="text-[10px] text-muted-foreground">Multi</span>
                      </div>
                    )}

                    {(field.type === 'rich_text' || field.type === 'plain_text') && (
                      <div className="flex items-center gap-1" title="Permitir IA">
                        <Checkbox
                          checked={field.allowAI}
                          onCheckedChange={(checked) => updateField(sIdx, fIdx, { allowAI: !!checked })}
                          disabled={section.key === 'object'}
                        />
                        <Sparkles className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}

                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeField(sIdx, fIdx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                <Button variant="ghost" size="sm" className="text-xs" onClick={() => addField(sIdx)}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Campo
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
