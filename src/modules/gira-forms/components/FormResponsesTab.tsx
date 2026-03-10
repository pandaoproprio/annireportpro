import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Inbox, Download, FileText, FileSpreadsheet, File, Search, CalendarIcon, X, Sparkles, User } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { exportToCsv, exportToExcel, exportToPdf, exportIndividualPdf, exportAiReport } from '../utils/exportResponses';
import type { Form, FormField, FormResponse } from '../types';

interface Props {
  formId: string;
  form: Form;
  fields: FormField[];
}

export const FormResponsesTab: React.FC<Props> = ({ formId, form, fields }) => {
  const [searchName, setSearchName] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [aiLoading, setAiLoading] = useState(false);

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

  const filtered = useMemo(() => {
    if (!responses) return [];
    return responses.filter(r => {
      if (searchName) {
        const name = (r.respondent_name || r.respondent_email || '').toLowerCase();
        if (!name.includes(searchName.toLowerCase())) return false;
      }
      if (dateFrom) {
        const d = new Date(r.submitted_at);
        if (d < startOfDay(dateFrom)) return false;
      }
      if (dateTo) {
        const d = new Date(r.submitted_at);
        if (d > endOfDay(dateTo)) return false;
      }
      return true;
    });
  }, [responses, searchName, dateFrom, dateTo]);

  const hasFilters = !!searchName || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearchName(''); setDateFrom(undefined); setDateTo(undefined); };

  const dataFields = useMemo(() => fields.filter(f => f.type !== 'section_header' && f.type !== 'info_text'), [fields]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!responses || responses.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Inbox className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Nenhuma resposta recebida ainda.</p>
      </div>
    );
  }

  const handleAiReport = async () => {
    setAiLoading(true);
    try {
      await exportAiReport(form, fields, filtered);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar respondente..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 h-9", dateFrom && "border-primary text-primary")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'De'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 h-9", dateTo && "border-primary text-primary")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateTo ? format(dateTo, 'dd/MM/yy') : 'Até'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-sm">
          {filtered.length} de {responses.length} resposta{responses.length !== 1 ? 's' : ''}
        </Badge>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAiReport}
            disabled={aiLoading || filtered.length === 0}
          >
            <Sparkles className={cn("w-3.5 h-3.5", aiLoading && "animate-spin")} />
            {aiLoading ? 'Analisando...' : 'Relatório IA'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-3.5 h-3.5" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCsv(form, fields, filtered)}>
                <File className="w-4 h-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(form, fields, filtered)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToPdf(form, fields, filtered)}>
                <FileText className="w-4 h-4 mr-2" /> PDF (tabela)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportIndividualPdf(form, fields, filtered)}>
                <User className="w-4 h-4 mr-2" /> PDF individual (fichas)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead className="whitespace-nowrap">Respondente</TableHead>
                  {dataFields.map(f => (
                    <TableHead key={f.id} className="whitespace-nowrap">{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dataFields.length + 2} className="text-center py-8 text-muted-foreground">
                      Nenhuma resposta encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(r.submitted_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.respondent_name || r.respondent_email || <span className="text-muted-foreground italic">Anônimo</span>}
                      </TableCell>
                      {dataFields.map(f => {
                        const val = r.answers?.[f.id];
                        const display = Array.isArray(val) ? val.join(', ') : String(val ?? '—');
                        return <TableCell key={f.id} className="text-sm max-w-[200px] truncate">{display}</TableCell>;
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
