import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Form, FormField } from '../types';
import type { Json } from '@/integrations/supabase/types';

export function useForms() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const formsQuery = useQuery({
    queryKey: ['gira-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Form[];
    },
    enabled: !!user,
  });

  const createForm = useMutation({
    mutationFn: async (form: { title: string; description?: string; category?: string; project_id?: string | null }) => {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: form.title,
          description: form.description || '',
          category: form.category || 'geral',
          project_id: form.project_id || null,
          user_id: user!.id,
          settings: {} as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Form;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gira-forms'] });
      toast.success('Formulário criado!');
    },
    onError: () => toast.error('Erro ao criar formulário'),
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; category?: string; status?: string; settings?: Record<string, unknown>; public_slug?: string }) => {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.settings !== undefined) payload.settings = updates.settings;
      if (updates.public_slug !== undefined) payload.public_slug = updates.public_slug;
      const { error } = await supabase.from('forms').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gira-forms'] });
      toast.success('Formulário atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gira-forms'] });
      toast.success('Formulário excluído!');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const duplicateForm = useMutation({
    mutationFn: async (sourceId: string) => {
      // 1. Fetch source form
      const { data: src, error: srcErr } = await supabase.from('forms').select('*').eq('id', sourceId).single();
      if (srcErr || !src) throw srcErr || new Error('Form not found');

      // 2. Create copy
      const { data: newForm, error: newErr } = await supabase
        .from('forms')
        .insert({
          title: `${src.title} (cópia)`,
          description: src.description,
          category: src.category,
          project_id: src.project_id,
          user_id: user!.id,
          settings: src.settings,
          status: 'ativo',
        })
        .select()
        .single();
      if (newErr || !newForm) throw newErr || new Error('Failed to create copy');

      // 3. Copy fields
      const { data: fields } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', sourceId)
        .order('sort_order');

      if (fields && fields.length > 0) {
        const copies = fields.map(f => ({
          form_id: newForm.id,
          type: f.type,
          label: f.label,
          description: f.description,
          required: f.required,
          options: f.options,
          sort_order: f.sort_order,
          settings: f.settings,
        }));
        await supabase.from('form_fields').insert(copies);
      }

      return newForm as unknown as Form;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gira-forms'] });
      toast.success('Formulário duplicado!');
    },
    onError: () => toast.error('Erro ao duplicar formulário'),
  });

  return { forms: formsQuery.data || [], isLoading: formsQuery.isLoading, createForm, updateForm, deleteForm, duplicateForm };
}

export function useFormFields(formId: string | undefined) {
  const qc = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ['gira-form-fields', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId!)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as FormField[];
    },
    enabled: !!formId,
  });

  const upsertField = useMutation({
    mutationFn: async (field: Partial<FormField> & { form_id: string }) => {
      const dbField: Record<string, unknown> = {
        form_id: field.form_id,
      };
      if (field.id) dbField.id = field.id;
      if (field.type !== undefined) dbField.type = field.type;
      if (field.label !== undefined) dbField.label = field.label;
      if (field.description !== undefined) dbField.description = field.description;
      if (field.required !== undefined) dbField.required = field.required;
      if (field.options !== undefined) dbField.options = field.options as unknown as Json;
      if (field.sort_order !== undefined) dbField.sort_order = field.sort_order;
      if (field.settings !== undefined) dbField.settings = field.settings as unknown as Json;

      const { data, error } = await supabase
        .from('form_fields')
        .upsert(dbField as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FormField;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gira-form-fields', formId] }),
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('form_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gira-form-fields', formId] }),
  });

  const reorderFields = useMutation({
    mutationFn: async (fields: { id: string; sort_order: number }[]) => {
      for (const f of fields) {
        await supabase.from('form_fields').update({ sort_order: f.sort_order }).eq('id', f.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gira-form-fields', formId] }),
  });

  return { fields: fieldsQuery.data || [], isLoading: fieldsQuery.isLoading, upsertField, deleteField, reorderFields };
}
