import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  isDropDisabled?: boolean;
  children: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id, title, color, count, isDropDisabled, children,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: isDropDisabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border-t-4 bg-muted/30 border border-border p-3 flex flex-col gap-3 transition-colors min-h-[300px]',
        color,
        isOver && !isDropDisabled && 'bg-primary/5 border-primary/40',
        isDropDisabled && 'opacity-80'
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {children}
      </div>
    </div>
  );
};
