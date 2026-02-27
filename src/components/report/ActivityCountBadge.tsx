import React from 'react';
import { BookOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActivityCountBadgeProps {
  count: number;
  label?: string;
}

export const ActivityCountBadge: React.FC<ActivityCountBadgeProps> = ({ count, label }) => {
  const hasActivities = count > 0;
  const tooltipText = label
    ? `${count} ${label}`
    : `${count} atividade${count !== 1 ? 's' : ''} do Diário de Bordo`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors cursor-default',
              hasActivities
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <BookOpen className="w-3 h-3" />
            {count}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
