import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useForms, useFormFields } from './hooks/useForms';
import { FormFieldEditor } from './components/FormFieldEditor';
import { ImportFieldsDialog } from './components/ImportFieldsDialog';
import { FormResponsesTab } from './components/FormResponsesTab';
import { FormDashboardTab } from './components/FormDashboardTab';
import { FormDesignEditor } from './components/FormDesignEditor';
import { FormDigestConfig } from './components/FormDigestConfig';
import { FormErrataDialog } from './components/FormErrataDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Eye, EyeOff, Share2, Copy, ExternalLink, Download, Link2 } from 'lucide-react';
import { FIELD_TYPE_LABELS, CATEGORIES, type Form, type FormField, type FieldType, type FormDesignSettings, type FormStatus } from './types';
import { motion, Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { FORMS_CANONICAL_HOST } from '@/lib/hostMode';
import { useShortLinks } from '@/hooks/useShortLinks';

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateForm } = useForms();
  const { fields, upsertField, deleteField, reorderFields } = useFormFields(id);
  const { shortenUrl, shortening } = useShortLinks();

  const formQuery = useQuery({
    queryKey: ['gira-form', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('forms').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!id,
  });

  const form = formQuery.data;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('geral');
  const [status, setStatus] = useState<FormStatus>('ativo');
  const [closesAt, setClosesAt] = useState<string>('');
  const [publicSlug, setPublicSlug] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [localFields, setLocalFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  React.useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description);
      setCategory(form.category);
      setStatus(form.status);
      setClosesAt((form as any).closes_at || '');
      setPublicSlug((form as any).public_slug || '');
    }
  }, [form]);

  React.useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  const handleSaveForm = async () => {
    if (!id) return;
    const slugToSave = publicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || undefined;
    await updateForm.mutateAsync({
      id,
      title,
      description,
      category,
      status,
      public_slug: slugToSave,
      closes_at: closesAt || null,
    });
    if (slugToSave) setPublicSlug(slugToSave);
  };

  const handleAddField = async (type: FieldType) => {
    if (!id) return;
    const maxOrder = localFields.length > 0 ? Math.max(...localFields.map(f => f.sort_order)) : -1;
    await upsertField.mutateAsync({
      form_id: id,
      type,
      label: FIELD_TYPE_LABELS[type],
      sort_order: maxOrder + 1,
    });
  };

  const handleReorder = (newOrder: FormField[]) => {
    setLocalFields(newOrder);
    const updates = newOrder.map((f, i) => ({ id: f.id, sort_order: i }));
    reorderFields.mutate(updates);
  };

  const CUSTOM_DOMAIN = `https://${FORMS_CANONICAL_HOST}`;
  const slugOrId = publicSlug || id;
  const publicUrl = `${CUSTOM_DOMAIN}/f/${slugOrId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copiado!');
  };

  if (formQuery.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!form) {
    return <div className="text-center py-16 text-muted-foreground">Formulário não encontrado.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/forms')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-[200px]">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0"
            placeholder="Título do formulário"
          />
        </div>
        <Badge
          variant={status === 'ativo' ? 'default' : status === 'pausado' ? 'secondary' : 'destructive'}
          className="cursor-pointer"
          onClick={() => setStatus(s => {
            if (s === 'ativo') return 'pausado';
            if (s === 'pausado') return 'encerrado';
            return 'ativo';
          })}
        >
          {status === 'ativo' ? <><Eye className="w-3 h-3 mr-1" /> Ativo</> :
           status === 'pausado' ? <><EyeOff className="w-3 h-3 mr-1" /> Pausado</> :
           status === 'encerrado' ? <><EyeOff className="w-3 h-3 mr-1" /> Encerrado</> :
           <><EyeOff className="w-3 h-3 mr-1" /> Inativo</>}
        </Badge>
        <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
          <Share2 className="w-3.5 h-3.5" /> Compartilhar
        </Button>
        {publicSlug === 'seminario-labrd-baixada' && id && (
          <FormErrataDialog formId={id} />
        )}
        <Button onClick={handleSaveForm} disabled={updateForm.isPending} className="gap-2">
          <Save className="w-4 h-4" /> Salvar
        </Button>
      </div>

      {/* Share bar */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Link público:</span>
            <Input value={publicUrl} readOnly className="h-8 text-xs bg-muted/50 font-mono" />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyLink}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild>
              <a href={`${window.location.origin}/f/${slugOrId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Slug personalizado:</span>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-xs text-muted-foreground font-mono">{CUSTOM_DOMAIN}/f/</span>
              <Input
                value={publicSlug}
                onChange={e => setPublicSlug(e.target.value)}
                placeholder="meu-formulario"
                className="h-8 text-xs font-mono flex-1"
              />
            </div>
            <span className="text-[10px] text-muted-foreground italic">Salve para aplicar</span>
          </div>
        </CardContent>
      </Card>

      {/* Status & Scheduling Controls */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Status:</span>
            <Select value={status} onValueChange={(v) => setStatus(v as FormStatus)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">🟢 Ativo</SelectItem>
                <SelectItem value="pausado">🟡 Pausado</SelectItem>
                <SelectItem value="encerrado">🔴 Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Encerramento automático:</span>
            <Input
              type="datetime-local"
              value={closesAt ? closesAt.slice(0, 16) : ''}
              onChange={e => setClosesAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="h-8 text-xs w-52"
            />
            {closesAt && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setClosesAt('')}>
                Limpar
              </Button>
            )}
          </div>
          {closesAt && (
            <span className="text-[10px] text-muted-foreground italic">
              O formulário será encerrado automaticamente em {new Date(closesAt).toLocaleString('pt-BR')}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Limite de respostas:</span>
            <Input
              type="number"
              min={0}
              value={(form.settings as any)?.maxResponses || ''}
              onChange={e => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                updateForm.mutateAsync({ id: id!, settings: { ...form.settings, maxResponses: val } as any });
              }}
              placeholder="Sem limite"
              className="h-8 text-xs w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Nº de inscrição:</span>
            <Switch
              checked={(form.settings as any)?.showRegistrationNumber ?? false}
              onCheckedChange={(checked) => {
                updateForm.mutateAsync({ id: id!, settings: { ...form.settings, showRegistrationNumber: checked } as any });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Check-in:</span>
            <Switch
              checked={(form.settings as any)?.enableCheckin ?? false}
              onCheckedChange={(checked) => {
                updateForm.mutateAsync({ id: id!, settings: { ...form.settings, enableCheckin: checked } as any });
              }}
            />
            {(form.settings as any)?.enableCheckin && (
              <>
                <a
                  href={`/form-checkin/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline ml-1"
                >
                  Abrir painel →
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  disabled={shortening}
                  onClick={async () => {
                    const originalUrl = `${window.location.origin}/form-checkin/${id}`;
                    const suggested = ((form as any).slug || form.title || 'painel')
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9-]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                      .slice(0, 30);
                    const input = window.prompt(
                      'Nome amigável para o link (deixe em branco para gerar automaticamente):',
                      `painel-${suggested}`,
                    );
                    if (input === null) return; // cancelado
                    const custom = input.trim() || undefined;
                    const shortUrl = await shortenUrl(originalUrl, custom);
                    if (shortUrl) {
                      try {
                        await navigator.clipboard.writeText(shortUrl);
                        toast.success('Link copiado!', { description: shortUrl });
                      } catch {
                        toast.success('Link gerado', { description: shortUrl });
                      }
                    }
                  }}
                >
                  <Link2 className="w-3 h-3" />
                  {shortening ? 'Encurtando…' : 'Encurtar link'}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0" title="Permite que o participante confirme presença antecipada após o envio do formulário">
              Pré-checkin:
            </span>
            <Switch
              checked={(form.settings as any)?.preCheckinEnabled ?? false}
              onCheckedChange={(checked) => {
                updateForm.mutateAsync({ id: id!, settings: { ...form.settings, preCheckinEnabled: checked } as any });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Visualizar</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="responses">Respostas</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Descrição do formulário..."
                  />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {localFields.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                  <PlusCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Adicione campos usando o painel lateral</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={localFields} onReorder={handleReorder} className="space-y-3">
                  {localFields.map(field => (
                    <Reorder.Item key={field.id} value={field}>
                      <FormFieldEditor
                        field={field}
                        isEditing={editingFieldId === field.id}
                        onToggleEdit={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                        onUpdate={async (updates) => {
                          await upsertField.mutateAsync({ ...field, ...updates });
                        }}
                        onDelete={() => {
                          if (confirm('Remover este campo?')) deleteField.mutate(field.id);
                        }}
                        onDuplicate={async () => {
                          const maxOrder = localFields.length > 0 ? Math.max(...localFields.map(f => f.sort_order)) : -1;
                          await upsertField.mutateAsync({
                            form_id: id!,
                            type: field.type,
                            label: `${field.label} (cópia)`,
                            description: field.description,
                            required: field.required,
                            options: field.options,
                            settings: field.settings,
                            sort_order: maxOrder + 1,
                          } as any);
                          toast.success('Campo duplicado!');
                        }}
                        allFields={localFields}
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Adicionar Campo</h3>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(type => (
                  <Button key={type} variant="outline" className="justify-start text-sm h-9" onClick={() => handleAddField(type)}>
                    <PlusCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                    {FIELD_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>

              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm h-9 gap-2"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  Importar de outro formulário
                </Button>
              </div>

              <FormDigestConfig formId={id!} />

              <ImportFieldsDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                currentFormId={id!}
                currentFieldCount={localFields.length}
                onImport={async (fieldsToImport) => {
                  for (const f of fieldsToImport) {
                    await upsertField.mutateAsync(f as any);
                  }
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-background" style={{ height: 'calc(100vh - 220px)' }}>
            <iframe
              key={activeTab === 'preview' ? 'preview-active' : 'preview-idle'}
              src={`${window.location.origin}/f/${slugOrId}`}
              className="w-full h-full border-0"
              title="Pré-visualização do formulário"
            />
          </div>
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <div className="max-w-2xl">
            <FormDesignEditor
              settings={(form.settings || {}) as FormDesignSettings}
              onSave={async (newSettings) => {
                await updateForm.mutateAsync({ id: id!, settings: newSettings as any });
                formQuery.refetch();
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <FormResponsesTab formId={id!} form={form} fields={fields} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <FormDashboardTab formId={id!} fields={fields} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
