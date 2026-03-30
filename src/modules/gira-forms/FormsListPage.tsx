import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForms } from './hooks/useForms';
import { useAppData } from '@/contexts/AppDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, FileText, Trash2, Pencil, ClipboardList, LayoutTemplate, CheckCircle2, Copy } from 'lucide-react';
import { CATEGORIES } from './types';
import { FORM_TEMPLATES, type FormTemplate } from './templates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function FormsListPage() {
  const { forms, isLoading, createForm, deleteForm, duplicateForm } = useForms();
  const { activeProjectId } = useAppData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('geral');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('em_branco');
  const [isCreating, setIsCreating] = useState(false);

  const filtered = forms.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  );

  const activeTemplate = FORM_TEMPLATES.find(t => t.id === selectedTemplate);

  const handleSelectTemplate = (tpl: FormTemplate) => {
    setSelectedTemplate(tpl.id);
    if (tpl.id !== 'em_branco') {
      if (!newTitle.trim()) setNewTitle(tpl.name);
      if (!newDesc.trim()) setNewDesc(tpl.description);
      setNewCategory(tpl.category);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const result = await createForm.mutateAsync({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        project_id: activeProjectId || null,
      });

      // Insert template fields if any
      if (activeTemplate && activeTemplate.fields.length > 0) {
        const fieldsToInsert = activeTemplate.fields.map((f, i) => ({
          form_id: result.id,
          type: f.type,
          label: f.label,
          description: f.description,
          required: f.required,
          options: f.options as any,
          settings: f.settings as any,
          sort_order: i,
        }));

        const { error } = await supabase.from('form_fields').insert(fieldsToInsert);
        if (error) {
          console.error('Error inserting template fields:', error);
          toast.error('Formulário criado, mas houve erro ao aplicar o template.');
        }
      }

      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
      setNewCategory('geral');
      setSelectedTemplate('em_branco');
      navigate(`/forms/${result.id}`);
    } catch {
      // error handled by mutation
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = (open: boolean) => {
    setShowCreate(open);
    if (!open) {
      setNewTitle('');
      setNewDesc('');
      setNewCategory('geral');
      setSelectedTemplate('em_branco');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-primary" />
            GIRA Formulários
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie formulários online configuráveis</p>
        </div>
        <Button onClick={() => resetDialog(true)} className="gap-2">
          <PlusCircle className="w-4 h-4" /> Novo Formulário
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar formulários..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{search ? 'Nenhum formulário encontrado.' : 'Nenhum formulário criado ainda.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((form, i) => (
            <motion.div key={form.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/forms/${form.id}`)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground line-clamp-1">{form.title}</h3>
                    <Badge variant={form.status === 'ativo' ? 'default' : form.status === 'pausado' ? 'secondary' : form.status === 'encerrado' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                      {form.status === 'ativo' ? 'Ativo' : form.status === 'pausado' ? 'Pausado' : form.status === 'encerrado' ? 'Encerrado' : 'Inativo'}
                    </Badge>
                  </div>
                  {form.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(form.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); navigate(`/forms/${form.id}`); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicar" onClick={e => {
                        e.stopPropagation();
                        duplicateForm.mutate(form.id);
                      }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => {
                        e.stopPropagation();
                        if (confirm('Excluir este formulário?')) deleteForm.mutate(form.id);
                      }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={resetDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template selector */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                Modelo
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {FORM_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`text-left p-3 rounded-lg border-2 transition-all hover:shadow-sm ${
                      selectedTemplate === tpl.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium text-sm text-foreground leading-tight">{tpl.name}</span>
                      {selectedTemplate === tpl.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
                    {tpl.fields.length > 0 && (
                      <span className="text-xs text-primary/70 mt-1 inline-block">{tpl.fields.length} campos</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Título *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nome do formulário" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descreva o objetivo..." rows={2} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
              {isCreating ? 'Criando...' : 'Criar Formulário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
