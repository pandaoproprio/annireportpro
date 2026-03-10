import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Invoice {
  id: string;
  user_id: string;
  project_id: string;
  reference_month: string;
  emission_date: string;
  file_url: string;
  file_name: string;
  observations: string;
  status: 'enviada' | 'aprovada' | 'rejeitada' | 'pendente';
  created_at: string;
  updated_at: string;
  // joined
  author_name?: string;
  author_email?: string;
  project_name?: string;
}

export function useInvoices(projectId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: async () => {
      let query = supabase
        .from('invoices' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Invoice[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: {
      project_id: string;
      reference_month: string;
      emission_date: string;
      file_url: string;
      file_name: string;
      observations?: string;
    }) => {
      const { error } = await supabase
        .from('invoices' as any)
        .insert({
          ...invoice,
          user_id: user!.id,
          status: 'enviada',
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Nota fiscal enviada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao enviar nota fiscal: ${err.message}`);
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('invoices' as any)
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Status atualizado!');
    },
  });

  // Calculate invoice deadline helpers
  const getLastBusinessDay = (year: number, month: number): Date => {
    const lastDay = new Date(year, month + 1, 0);
    while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
      lastDay.setDate(lastDay.getDate() - 1);
    }
    return lastDay;
  };

  const getAlertDate = (year: number, month: number): Date => {
    const deadline = getLastBusinessDay(year, month);
    const alertDate = new Date(deadline);
    alertDate.setDate(alertDate.getDate() - 5);
    return alertDate;
  };

  const isOverdue = (referenceMonth: string): boolean => {
    const ref = new Date(referenceMonth);
    const deadline = getLastBusinessDay(ref.getFullYear(), ref.getMonth());
    return new Date() > deadline;
  };

  return {
    invoices: invoicesQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    createInvoice,
    updateInvoiceStatus,
    getLastBusinessDay,
    getAlertDate,
    isOverdue,
  };
}
