import React from 'react';
import { DocumentBlock, TextBlock as TextBlockType } from '@/types/document';

interface TextBlockProps {
  block: TextBlockType;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBlockType>) => void;
}

export const TextBlockComponent: React.FC<TextBlockProps> = ({ block, isActive, onSelect, onUpdate }) => {
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onUpdate({ content: e.currentTarget.innerHTML });
  };

  return (
    <div
      className={`relative group cursor-text transition-all ${isActive ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
        padding: `${block.padding}mm`,
        width: `${block.width}%`,
        textAlign: block.alignment === 'justify' ? 'justify' : block.alignment,
        fontSize: `${block.fontSize}pt`,
        fontFamily: block.fontFamily,
        fontWeight: block.bold ? 'bold' : 'normal',
        fontStyle: block.italic ? 'italic' : 'normal',
        textDecoration: block.underline ? 'underline' : 'none',
        lineHeight: block.lineHeight,
        color: block.color,
      }}
      onClick={onSelect}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: block.content || '<p>Digite aqui...</p>' }}
        className="outline-none min-h-[1.5em]"
      />
    </div>
  );
};
