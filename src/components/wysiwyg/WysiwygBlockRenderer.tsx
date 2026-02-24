import React from 'react';
import { DocumentBlock } from '@/types/document';
import { WysiwygTextBlock } from './blocks/WysiwygTextBlock';
import { WysiwygImageBlock } from './blocks/WysiwygImageBlock';
import { WysiwygTableBlock } from './blocks/WysiwygTableBlock';
import { WysiwygSpacerBlock } from './blocks/WysiwygSpacerBlock';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  block: DocumentBlock;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DocumentBlock>) => void;
  onRemove: () => void;
}

export const WysiwygBlockRenderer: React.FC<Props> = ({ block, isActive, onSelect, onUpdate, onRemove }) => {
  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return <WysiwygTextBlock block={block} isActive={isActive} onSelect={onSelect} onUpdate={onUpdate} />;
      case 'image':
        return <WysiwygImageBlock block={block} isActive={isActive} onSelect={onSelect} onUpdate={onUpdate} />;
      case 'table':
        return <WysiwygTableBlock block={block} isActive={isActive} onSelect={onSelect} onUpdate={onUpdate} />;
      case 'spacer':
        return <WysiwygSpacerBlock block={block} isActive={isActive} onSelect={onSelect} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative group">
      {/* Inline controls */}
      <div className="absolute -left-9 top-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center justify-center h-6 w-6 cursor-grab text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <Button
          variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {renderBlock()}
    </div>
  );
};
