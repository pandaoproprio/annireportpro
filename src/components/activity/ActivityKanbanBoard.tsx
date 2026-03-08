import React, { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Activity } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

export type KanbanStatus = 'draft' | 'published' | 'linked';

interface ActivityKanbanBoardProps {
  activities: Activity[];
  isAdmin: boolean;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onView: (activity: Activity) => void;
  onStatusChange: (activity: Activity, newStatus: KanbanStatus) => void;
}

const deriveStatus = (act: Activity): KanbanStatus => {
  if (act.isLinkedToReport) return 'linked';
  if (act.isDraft) return 'draft';
  return 'published';
};

const COLUMNS: { id: KanbanStatus; title: string; color: string }[] = [
  { id: 'draft', title: 'Rascunho', color: 'border-t-warning' },
  { id: 'published', title: 'Publicado', color: 'border-t-success' },
  { id: 'linked', title: 'Vinculado a Relatório', color: 'border-t-primary' },
];

export const ActivityKanbanBoard: React.FC<ActivityKanbanBoardProps> = ({
  activities, isAdmin, onEdit, onDelete, onView, onStatusChange,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = useMemo(() => {
    const map: Record<KanbanStatus, Activity[]> = { draft: [], published: [], linked: [] };
    activities.forEach(a => map[deriveStatus(a)].push(a));
    return map;
  }, [activities]);

  const activeActivity = useMemo(
    () => (activeId ? activities.find(a => a.id === activeId) : undefined),
    [activeId, activities]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activityId = active.id as string;
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    // Determine target column
    let targetColumn: KanbanStatus | null = null;
    if (COLUMNS.some(c => c.id === over.id)) {
      targetColumn = over.id as KanbanStatus;
    } else {
      // Dropped on a card — find which column it belongs to
      const overActivity = activities.find(a => a.id === over.id);
      if (overActivity) targetColumn = deriveStatus(overActivity);
    }

    if (!targetColumn || targetColumn === deriveStatus(activity)) return;

    // "linked" status is read-only — can't drag into or out of it
    if (targetColumn === 'linked' || deriveStatus(activity) === 'linked') return;

    onStatusChange(activity, targetColumn);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            count={grouped[col.id].length}
            isDropDisabled={col.id === 'linked'}
          >
            <SortableContext
              items={grouped[col.id].map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {grouped[col.id].map(activity => (
                <KanbanCard
                  key={activity.id}
                  activity={activity}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  isDraggable={col.id !== 'linked'}
                />
              ))}
            </SortableContext>
            {grouped[col.id].length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade
              </p>
            )}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeActivity && (
          <KanbanCard
            activity={activeActivity}
            isAdmin={isAdmin}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isDraggable={false}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};
