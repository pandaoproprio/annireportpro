import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateStructureEditor } from '@/components/template/TemplateStructureEditor';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import type { TemplateSection } from '@/types/reportTemplate';
import {
  DEFAULT_OBJETO_SECTIONS,
  DEFAULT_EQUIPE_SECTIONS,
  DEFAULT_JUSTIFICATIVA_SECTIONS,
} from '@/types/reportTemplate';

const typeDefaults: Record<string, TemplateSection[]> = {
  objeto: DEFAULT_OBJETO_SECTIONS,
  equipe: DEFAULT_EQUIPE_SECTIONS,
  justificativa: DEFAULT_JUSTIFICATIVA_SECTIONS,
  personalizado: [
    {
      id: `custom_${Date.now()}`,
      title: 'Seção 1',
      key: 'section_1',
      type: 'custom',
      isVisible: true,
      isRequired: false,
      order: 0,
      fields: [
        { id: `field_${Date.now()}`, type: 'rich_text', label: 'Conteúdo', isRequired: false, allowMultiple: false, allowAI: true, maxFiles: null },
      ],
    },
  ],
};

export const ReportTemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { templates, isLoading, createTemplate, updateTemplate } = useReportTemplates();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [type, setType] = useState<string>('personalizado');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [useAbnt, setUseAbnt] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing template
  useEffect(() => {
    if (!isNew && !isLoading) {
      const template = templates.find(t => t.id === id);
      if (template) {
        setName(template.name);
        setType(template.type);
        setSections(template.structure || []);
        setUseAbnt(template.exportConfig?.abnt !== false);
      }
    }
  }, [id, isNew, templates, isLoading]);

  // When type changes on new template, load defaults
  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (isNew || sections.length === 0) {
      setSections(typeDefaults[newType] || typeDefaults.personalizado);
    }
  };

  // Initialize default sections for new template
  useEffect(() => {
    if (isNew && sections.length === 0) {
      setSections(typeDefaults[type] || typeDefaults.personalizado);
    }
  }, [isNew, type, sections.length]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await createTemplate.mutateAsync({ name, type, structure: sections });
      } else {
        await updateTemplate.mutateAsync({
          id: id!,
          name,
          type: type as any,
          structure: sections,
          exportConfig: { abnt: useAbnt },
        });
      }
      navigate('/templates');
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/templates')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isNew ? 'Novo Template' : 'Editar Template'}</h1>
          <p className="text-sm text-muted-foreground">Configure a estrutura do modelo de relatório.</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Relatório Cultural 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="objeto">Relatório do Objeto</SelectItem>
                  <SelectItem value="equipe">Relatório da Equipe</SelectItem>
                  <SelectItem value="justificativa">Justificativa</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={useAbnt} onCheckedChange={setUseAbnt} id="abnt-switch" />
            <Label htmlFor="abnt-switch" className="text-sm">
              Exportar no padrão ABNT (Times New Roman 12pt, margens 3/2cm, justificado)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Structure Editor */}
      <TemplateStructureEditor sections={sections} onChange={setSections} />

      {/* Save Button */}
      <div className="fixed bottom-4 right-4 md:right-8 z-20">
        <Button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="shadow-xl bg-primary hover:bg-primary/90 rounded-full px-6 py-3 h-auto text-base"
        >
          {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          {isNew ? 'Criar Template' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
};
