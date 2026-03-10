import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Inbox, Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/exportResponses';
import type { Form, FormField, FormResponse } from '../types';

interface Props {
  formId: string;
  form: Form;
  fields: FormField[];
}

export const FormResponsesTab: React.FC<Props> = ({ formId, form, fields }) => {
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
        <p className="text-muted-foreground">Nenhuma resposta recebida ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-sm">
          {responses.length} resposta{responses.length !== 1 ? 's' : ''}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToCsv(form, fields, responses)}>
              <File className="w-4 h-4 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel(form, fields, responses)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { exportToPdf(form, fields, responses); }}>
              <FileText className="w-4 h-4 mr-2" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead className="whitespace-nowrap">Respondente</TableHead>
                  {fields.map(f => (
                    <TableHead key={f.id} className="whitespace-nowrap">{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(r.submitted_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.respondent_name || r.respondent_email || <span className="text-muted-foreground italic">Anônimo</span>}
                    </TableCell>
                    {fields.map(f => {
                      const val = r.answers?.[f.id];
                      const display = Array.isArray(val) ? val.join(', ') : String(val ?? '—');
                      return <TableCell key={f.id} className="text-sm max-w-[200px] truncate">{display}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
