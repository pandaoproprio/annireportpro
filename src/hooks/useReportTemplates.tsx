import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ReportTemplate, TemplateSection } from '@/types/reportTemplate';

// Map DB row → ReportTemplate
const mapRow = (row: any): ReportTemplate => ({
  id: row.id,
  name: row.name,
  type: row.type,
  structure: (row.structure || []) as TemplateSection[],
  exportConfig: row.export_config || { abnt: true },
  isActive: row.is_active,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useReportTemplates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    enabled: !!user,
  });

  // Create
  const createTemplate = useMutation({
    mutationFn: async (template: { name: string; type: string; structure: TemplateSection[] }) => {
      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name: template.name,
          type: template.type,
          structure: template.structure as any,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar template'),
  });

  // Update
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReportTemplate> & { id: string }) => {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.structure !== undefined) payload.structure = updates.structure;
      if (updates.exportConfig !== undefined) payload.export_config = updates.exportConfig;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const { error } = await supabase
        .from('report_templates')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Template atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar template'),
  });

  // Duplicate
  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const source = templates.find(t => t.id === templateId);
      if (!source) throw new Error('Template não encontrado');

      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name: `${source.name} (cópia)`,
          type: source.type,
          structure: source.structure as any,
          export_config: source.exportConfig as any,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Template duplicado!');
    },
    onError: () => toast.error('Erro ao duplicar template'),
  });

  // Delete
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Template excluído!');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('report_templates')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    toggleActive,
  };
};
