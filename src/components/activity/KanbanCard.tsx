import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Activity } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Edit, Trash2, GripVertical, MapPin, Users, Clock } from 'lucide-react';
import { canEditActivity } from '@/lib/diaryEditRules';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  activity: Activity;
  isAdmin: boolean;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onView: (activity: Activity) => void;
  isDraggable?: boolean;
  isOverlay?: boolean;
}

const typeColorMap: Record<string, string> = {
  'Execução de Meta': 'bg-success/10 text-success border-success/30',
  'Ocorrência/Imprevisto': 'bg-destructive/10 text-destructive border-destructive/30',
  'Divulgação/Mídia': 'bg-info/10 text-info border-info/30',
  'Reunião de Equipe': 'bg-warning/10 text-warning border-warning/30',
};

export const KanbanCard: React.FC<KanbanCardProps> = ({
  activity, isAdmin, onEdit, onDelete, onView, isDraggable = true, isOverlay,
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: activity.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const editCheck = canEditActivity(activity.createdAt, isAdmin, activity.isLinkedToReport);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border bg-background p-3 shadow-sm hover:shadow-md transition-shadow cursor-default group',
        isDragging && 'opacity-40',
        isOverlay && 'shadow-lg ring-2 ring-primary/30 rotate-2'
      )}
    >
      <div className="flex items-start gap-2">
        {isDraggable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
            {activity.description}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn('text-[10px] px-1.5', typeColorMap[activity.type] || 'bg-muted text-muted-foreground')}>
              {activity.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />
              {new Date(activity.date).toLocaleDateString('pt-BR')}
            </span>
            {(activity.startTime || activity.endTime) && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {activity.startTime || '—'}{activity.endTime ? `-${activity.endTime}` : ''}
              </span>
            )}
            {activity.location && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{activity.location}</span>
              </span>
            )}
            {activity.attendeesCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {activity.attendeesCount}
              </span>
            )}
          </div>
          {activity.authorName && (
            <p className="text-[10px] text-muted-foreground truncate">
              {activity.authorName}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onView(activity)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(activity)} disabled={!editCheck.allowed} title={editCheck.reason || 'Editar'}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(activity.id)} disabled={!editCheck.allowed} title={editCheck.reason || 'Excluir'}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
