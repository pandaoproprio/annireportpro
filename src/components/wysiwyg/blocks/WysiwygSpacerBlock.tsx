import React from 'react';
import { SpacerBlock as SpacerBlockType } from '@/types/document';

interface Props {
  block: SpacerBlockType;
  isActive: boolean;
  onSelect: () => void;
}

export const WysiwygSpacerBlock: React.FC<Props> = ({ block, isActive, onSelect }) => {
  return (
    <div
      className={`relative group transition-shadow ${isActive ? 'ring-2 ring-primary/60 ring-offset-1 rounded-sm' : ''}`}
      style={{
        height: `${block.height}mm`,
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
      }}
      onClick={onSelect}
    >
      <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="border-t border-dashed border-muted-foreground/40 w-full" />
        <span className="absolute text-[10px] text-muted-foreground bg-white px-2">{block.height}mm</span>
      </div>
    </div>
  );
};
