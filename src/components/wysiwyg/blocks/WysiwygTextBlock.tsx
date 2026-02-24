import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextBlock as TextBlockType } from '@/types/document';

interface Props {
  block: TextBlockType;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBlockType>) => void;
}

export const WysiwygTextBlock: React.FC<Props> = ({ block, isActive, onSelect, onUpdate }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false }),
      Underline,
    ],
    content: block.content || '<p></p>',
    onUpdate: ({ editor: e }) => {
      onUpdate({ content: e.getHTML() });
    },
    onFocus: () => onSelect(),
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[1.5em] w-full',
        style: [
          `font-size: ${block.fontSize}pt`,
          `font-family: ${block.fontFamily}`,
          `line-height: ${block.lineHeight}`,
          `color: ${block.color}`,
          `text-align: ${block.alignment}`,
        ].join(';'),
      },
    },
  });

  return (
    <div
      className={`relative cursor-text transition-shadow ${
        isActive
          ? 'ring-2 ring-primary/60 ring-offset-1 rounded-sm'
          : 'hover:ring-1 hover:ring-muted-foreground/20 rounded-sm'
      }`}
      style={{
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
        padding: `${block.padding}mm`,
        width: `${block.width}%`,
        fontWeight: block.bold ? 'bold' : 'normal',
        fontStyle: block.italic ? 'italic' : 'normal',
        textDecoration: block.underline ? 'underline' : 'none',
      }}
      onClick={onSelect}
    >
      <EditorContent editor={editor} />
    </div>
  );
};
