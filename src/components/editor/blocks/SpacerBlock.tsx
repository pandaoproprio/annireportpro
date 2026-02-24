import React from 'react';
import { SpacerBlock as SpacerBlockType } from '@/types/document';

interface SpacerBlockProps {
  block: SpacerBlockType;
  isActive: boolean;
  onSelect: () => void;
}

export const SpacerBlockComponent: React.FC<SpacerBlockProps> = ({ block, isActive, onSelect }) => {
  return (
    <div
      className={`relative group transition-all ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      style={{
        height: `${block.height}mm`,
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
      }}
      onClick={onSelect}
    >
      <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="border-t border-dashed border-muted-foreground/40 w-full" />
        <span className="absolute text-[10px] text-muted-foreground bg-background px-2">{block.height}mm</span>
      </div>
    </div>
  );
};
