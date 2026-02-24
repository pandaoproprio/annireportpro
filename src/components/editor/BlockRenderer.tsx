import React from 'react';
import { DocumentBlock } from '@/types/document';
import { TextBlockComponent } from './blocks/TextBlock';
import { ImageBlockComponent } from './blocks/ImageBlock';
import { TableBlockComponent } from './blocks/TableBlock';
import { SpacerBlockComponent } from './blocks/SpacerBlock';
import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockRendererProps {
  block: DocumentBlock;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DocumentBlock>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block, isActive, onSelect, onUpdate, onRemove, onMove,
}) => {
  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return <TextBlockComponent block={block} isActive={isActive} onSelect={onSelect} onUpdate={onUpdate} />;
      case 'image':
        return <ImageBlockComponent block={block} isActive={isActive} onSelect={onSelect} onUpdate={onUpdate} />;
      case 'table':
        return <TableBlockComponent block={block} isActive={isActive} onSelect={onSelect} onUpdate={onUpdate} />;
      case 'spacer':
        return <SpacerBlockComponent block={block} isActive={isActive} onSelect={onSelect} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative group">
      {/* Block controls — visible on hover */}
      <div className="absolute -left-10 top-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('up')}>
          <ArrowUp className="h-3 w-3" />
        </Button>
        <div className="flex items-center justify-center h-6 w-6 cursor-grab text-muted-foreground">
          <GripVertical className="h-3 w-3" />
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('down')}>
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {renderBlock()}
    </div>
  );
};
