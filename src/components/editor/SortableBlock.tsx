import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableBlockProps {
  id: string;
  children: React.ReactNode;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle overlay - the GripVertical in BlockRenderer acts as visual cue */}
      <div
        {...listeners}
        className="absolute -left-10 top-2 w-6 h-6 flex items-center justify-center cursor-grab z-20"
        style={{ touchAction: 'none' }}
      />
      {children}
    </div>
  );
};
