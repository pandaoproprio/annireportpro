import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

interface DateRangePickersProps {
  periodStart: Date | undefined;
  periodEnd: Date | undefined;
  onStartChange: (date: Date | undefined) => void;
  onEndChange: (date: Date | undefined) => void;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

export const DateRangePickers: React.FC<DateRangePickersProps> = ({
  periodStart,
  periodEnd,
  onStartChange,
  onEndChange,
  projectStartDate,
  projectEndDate,
}) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Data Início */}
      <div className="space-y-2">
        <Label>Data Início *</Label>
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !periodStart && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {periodStart ? format(periodStart, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={periodStart}
              onSelect={(date) => {
                onStartChange(date);
                setStartOpen(false);
                // Auto-open end picker if no end date
                if (!periodEnd) {
                  setTimeout(() => setEndOpen(true), 150);
                }
              }}
              locale={ptBR}
              defaultMonth={periodStart || projectStartDate}
              disabled={(date) => {
                if (projectEndDate && date > projectEndDate) return true;
                return false;
              }}
              className="pointer-events-auto"
            />
            {projectStartDate && (
              <div className="px-3 pb-2">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    onStartChange(projectStartDate);
                    setStartOpen(false);
                    if (!periodEnd) setTimeout(() => setEndOpen(true), 150);
                  }}
                >
                  Usar início do projeto: {format(projectStartDate, 'dd/MM/yyyy', { locale: ptBR })}
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Data Fim */}
      <div className="space-y-2">
        <Label>Data Fim *</Label>
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !periodEnd && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {periodEnd ? format(periodEnd, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={periodEnd}
              onSelect={(date) => {
                onEndChange(date);
                setEndOpen(false);
              }}
              locale={ptBR}
              defaultMonth={periodEnd || periodStart || projectEndDate}
              disabled={(date) => {
                if (periodStart && date < periodStart) return true;
                return false;
              }}
              className="pointer-events-auto"
            />
            {projectEndDate && (
              <div className="px-3 pb-2">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    onEndChange(projectEndDate);
                    setEndOpen(false);
                  }}
                >
                  Usar fim do projeto: {format(projectEndDate, 'dd/MM/yyyy', { locale: ptBR })}
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
