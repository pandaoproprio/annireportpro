 import React, { forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

 export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
   ({ value, onChange, placeholder = 'Digite aqui...', className }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[250px] px-3 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

   return (
     <div ref={ref} className={cn('border rounded-md bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/30">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Negrito"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Itálico"
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Sublinhado"
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Lista com marcadores"
          title="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Lista numerada"
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Desfazer"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Refazer"
          title="Refazer (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="[&_.ProseMirror]:min-h-[250px] [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_li]:my-1"
      />
      
      {!value && (
        <style>{`
          .ProseMirror p.is-editor-empty:first-child::before {
            content: '${placeholder}';
            color: hsl(var(--muted-foreground));
            float: left;
            height: 0;
            pointer-events: none;
          }
       `}</style>
       )}
     </div>
   );
 });
 
 RichTextEditor.displayName = 'RichTextEditor';
