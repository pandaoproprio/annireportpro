import React from 'react';
import { ImageBlock as ImageBlockType } from '@/types/document';
import { ImageIcon } from 'lucide-react';

interface ImageBlockProps {
  block: ImageBlockType;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageBlockType>) => void;
}

export const ImageBlockComponent: React.FC<ImageBlockProps> = ({ block, isActive, onSelect, onUpdate }) => {
  return (
    <div
      className={`relative group transition-all ${isActive ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
        padding: `${block.padding}mm`,
        width: `${block.width}%`,
        textAlign: block.alignment === 'justify' ? 'center' : block.alignment,
      }}
      onClick={onSelect}
    >
      {block.src ? (
        <div className="inline-block">
          <img
            src={block.src}
            alt={block.caption || 'Imagem do documento'}
            style={{
              width: `${block.displayWidth}mm`,
              height: `${block.displayHeight}mm`,
              objectFit: 'contain',
              border: block.borderWidth > 0 ? `${block.borderWidth}px solid ${block.borderColor}` : 'none',
            }}
            className="max-w-full"
          />
          {block.caption && (
            <p className="text-xs text-muted-foreground italic text-center mt-1">{block.caption}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
          <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground">Clique para adicionar imagem</span>
        </div>
      )}
    </div>
  );
};
