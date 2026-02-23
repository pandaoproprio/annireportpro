import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PhotoWithCaption } from '@/types';

interface SortablePhotoProps {
  photo: PhotoWithCaption;
  index: number;
  onRemove: (index: number) => void;
  onUpdateCaption: (index: number, caption: string) => void;
}

export const SortablePhoto: React.FC<SortablePhotoProps> = ({
  photo,
  index,
  onRemove,
  onUpdateCaption,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id || `photo-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 p-3 border rounded-lg bg-muted/30 ${
        isDragging ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
    >
      {/* Photo */}
      <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
        <img
          src={photo.url}
          alt={`Foto ${index + 1}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
        <button
          onClick={() => onRemove(index)}
          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90"
        >
          <X className="w-3 h-3" />
        </button>
        <button
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1 p-1 bg-background/80 rounded cursor-grab active:cursor-grabbing touch-none"
          title="Arraste para reordenar"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Caption */}
      <Input
        value={photo.caption}
        onChange={(e) => onUpdateCaption(index, e.target.value)}
        placeholder={`Legenda da foto ${index + 1}...`}
        className="text-xs h-8"
      />
    </div>
  );
};
