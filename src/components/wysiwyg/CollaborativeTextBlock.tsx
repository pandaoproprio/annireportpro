import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { TextBlock as TextBlockType } from '@/types/document';
import { cn } from '@/lib/utils';

interface Props {
  block: TextBlockType;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBlockType>) => void;
  /** Shared Yjs document from provider */
  ydoc: Y.Doc | null;
  /** Awareness from provider for cursors */
  awareness: Awareness | null;
}

export const CollaborativeTextBlock: React.FC<Props> = ({
  block,
  isActive,
  onSelect,
  onUpdate,
  ydoc,
  awareness,
}) => {
  // Each block gets its own Y.XmlFragment keyed by block.id
  const fragment = useMemo(() => {
    if (!ydoc) return null;
    return ydoc.getXmlFragment(`block-${block.id}`);
  }, [ydoc, block.id]);

  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        // Disable built-in history when collaborating (Yjs handles undo)
        ...(fragment ? { history: false } : {}),
      }),
      Underline,
    ];

    if (fragment) {
      base.push(
        Collaboration.configure({ fragment }) as any,
      );

      if (awareness) {
        base.push(
          CollaborationCursor.configure({
            provider: { awareness } as any,
            user: awareness.getLocalState()?.user || { name: 'Anônimo', color: '#8b5cf6' },
          }) as any,
        );
      }
    }

    return base;
  }, [fragment, awareness]);

  const editor = useEditor({
    extensions,
    // Only set initial content when NOT using Yjs (Yjs manages content)
    ...(fragment ? {} : { content: block.content || '<p></p>' }),
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
  }, [fragment, awareness]);

  // Initialize Yjs fragment with existing content if it's empty
  useEffect(() => {
    if (editor && fragment && fragment.length === 0 && block.content) {
      editor.commands.setContent(block.content, false);
    }
  }, [editor, fragment, block.content]);

  return (
    <div
      className={cn(
        'relative cursor-text transition-shadow rounded-sm',
        isActive
          ? 'ring-2 ring-primary/60 ring-offset-1'
          : 'hover:ring-1 hover:ring-muted-foreground/20',
      )}
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
      {/* Cursor label styles injected globally via CSS */}
      <style>{`
        .collaboration-cursor__caret {
          border-left: 2px solid;
          border-color: var(--cursor-color, #8b5cf6);
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }
        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: white;
          font-size: 11px;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 1px 6px;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
