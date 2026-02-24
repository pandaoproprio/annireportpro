import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

interface HeaderFooterRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const HeaderFooterRichEditor: React.FC<HeaderFooterRichEditorProps> = ({
  content, onChange, placeholder = 'Digite aqui...',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
      }),
      Underline,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[2rem] text-xs p-2',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      {/* Mini toolbar */}
      <div className="flex items-center gap-0.5 px-1 py-0.5 border-b bg-muted/30">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className="h-6 w-6 p-0"
        >
          <Bold className="h-3 w-3" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className="h-6 w-6 p-0"
        >
          <Italic className="h-3 w-3" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          className="h-6 w-6 p-0"
        >
          <UnderlineIcon className="h-3 w-3" />
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
