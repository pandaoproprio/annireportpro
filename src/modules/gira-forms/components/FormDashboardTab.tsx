import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';
import { FormDashboard } from './FormDashboard';
import type { FormField, FormResponse } from '../types';

interface Props {
  formId: string;
  fields: FormField[];
}

export const FormDashboardTab: React.FC<Props> = ({ formId, fields }) => {
  const { data: responses, isLoading } = useQuery({
    queryKey: ['gira-form-responses', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FormResponse[];
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!responses || responses.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Inbox className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Nenhuma resposta para gerar o dashboard.</p>
      </div>
    );
  }

  return <FormDashboard responses={responses} fields={fields} />;
};
