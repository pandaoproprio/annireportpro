import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      className={`flex gap-4 items-start p-4 border rounded-lg bg-muted/30 ${
        isDragging ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-2 hover:bg-muted rounded cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        title="Arraste para reordenar"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Photo Thumbnail */}
      <div className="relative w-32 h-32 flex-shrink-0">
        <img
          src={photo.url}
          alt={`Foto ${index + 1}`}
          className="w-full h-full object-cover rounded-lg border"
          draggable={false}
        />
        <button
          onClick={() => onRemove(index)}
          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Caption Input */}
      <div className="flex-1 space-y-2">
        <Label htmlFor={`caption-${index}`} className="text-sm font-medium flex items-center gap-1">
          <Edit2 className="w-3 h-3" />
          Legenda da Foto {index + 1}
        </Label>
        <Input
          id={`caption-${index}`}
          value={photo.caption}
          onChange={(e) => onUpdateCaption(index, e.target.value)}
          placeholder="Descreva esta foto..."
          className="w-full"
        />
      </div>
    </div>
  );
};
