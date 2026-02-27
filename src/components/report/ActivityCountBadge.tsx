import React from 'react';
import { BookOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActivityCountBadgeProps {
  count: number;
  label?: string;
  onClick?: () => void;
}

export const ActivityCountBadge: React.FC<ActivityCountBadgeProps> = ({ count, label, onClick }) => {
  const hasActivities = count > 0;
  const clickable = hasActivities && !!onClick;
  const tooltipText = label
    ? `${count} ${label}`
    : hasActivities
      ? `${count} atividade${count !== 1 ? 's' : ''} do Diário — clique para ver`
      : 'Nenhuma atividade vinculada';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={clickable ? onClick : undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
              hasActivities
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground',
              clickable
                ? 'cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-800/50 hover:scale-105 active:scale-95'
                : 'cursor-default'
            )}
          >
            <BookOpen className="w-3 h-3" />
            {count}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
