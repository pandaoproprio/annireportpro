import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useForms, useFormFields } from './hooks/useForms';
import { FormFieldEditor } from './components/FormFieldEditor';
import { FormResponsesTab } from './components/FormResponsesTab';
import { FormDashboardTab } from './components/FormDashboardTab';
import { FormDesignEditor } from './components/FormDesignEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Save, Eye, EyeOff, Share2, Copy, ExternalLink } from 'lucide-react';
import { FIELD_TYPE_LABELS, CATEGORIES, type Form, type FormField, type FieldType } from './types';
import { motion, Reorder } from 'framer-motion';
import { toast } from 'sonner';

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateForm } = useForms();
  const { fields, upsertField, deleteField, reorderFields } = useFormFields(id);

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
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [localFields, setLocalFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState('editor');

  React.useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description);
      setCategory(form.category);
      setStatus(form.status);
    }
  }, [form]);

  React.useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  const handleSaveForm = async () => {
    if (!id) return;
    await updateForm.mutateAsync({ id, title, description, category, status });
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

  const publicUrl = `${window.location.origin}/f/${id}`;

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
        <Badge variant={status === 'ativo' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setStatus(s => s === 'ativo' ? 'inativo' : 'ativo')}>
          {status === 'ativo' ? <><Eye className="w-3 h-3 mr-1" /> Ativo</> : <><EyeOff className="w-3 h-3 mr-1" /> Inativo</>}
        </Badge>
        <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
          <Share2 className="w-3.5 h-3.5" /> Compartilhar
        </Button>
        <Button onClick={handleSaveForm} disabled={updateForm.isPending} className="gap-2">
          <Save className="w-4 h-4" /> Salvar
        </Button>
      </div>

      {/* Share bar */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Link público:</span>
          <Input value={publicUrl} readOnly className="h-8 text-xs bg-muted/50 font-mono" />
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyLink}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="responses">Respostas</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Fields area */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descrição do formulário..."
                    rows={2}
                    className="resize-none"
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
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>

            {/* Sidebar */}
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
            </div>
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
