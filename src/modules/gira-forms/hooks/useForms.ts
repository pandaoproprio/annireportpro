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
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; category?: string; status?: string }) => {
      const { error } = await supabase.from('forms').update(updates).eq('id', id);
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

  return { forms: formsQuery.data || [], isLoading: formsQuery.isLoading, createForm, updateForm, deleteForm };
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
