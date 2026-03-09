import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Form, FormField } from '../types';

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
      return data as Form[];
    },
    enabled: !!user,
  });

  const createForm = useMutation({
    mutationFn: async (form: Partial<Form>) => {
      const { data, error } = await supabase
        .from('forms')
        .insert({ ...form, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Form;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gira-forms'] });
      toast.success('Formulário criado!');
    },
    onError: () => toast.error('Erro ao criar formulário'),
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Form> & { id: string }) => {
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
      return data as FormField[];
    },
    enabled: !!formId,
  });

  const upsertField = useMutation({
    mutationFn: async (field: Partial<FormField> & { form_id: string }) => {
      const { data, error } = await supabase
        .from('form_fields')
        .upsert(field)
        .select()
        .single();
      if (error) throw error;
      return data as FormField;
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
