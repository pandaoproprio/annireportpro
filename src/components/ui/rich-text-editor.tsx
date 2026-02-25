import React, { forwardRef, useRef, useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TiptapImage from '@tiptap/extension-image';
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
  ImageIcon,
  Loader2,
  Images,
  Trash2,
  Grid2x2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

// ── Custom Image NodeView with caption + resize ──
const InlineImageView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
  const [editing, setEditing] = useState(false);
  const caption = node.attrs['data-caption'] || '';
  const widthPct = node.attrs['data-width'] || 100;

  return (
    <NodeViewWrapper className="my-3">
      <div
        className={cn(
          'relative inline-block w-full text-center group cursor-pointer',
          selected && 'ring-2 ring-primary/50 ring-offset-2 rounded'
        )}
        onClick={() => setEditing(true)}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || caption || 'Imagem'}
          style={{ width: `${widthPct}%`, margin: '0 auto' }}
          className="rounded-md max-w-full block mx-auto"
          draggable={false}
        />
        {caption && !editing && (
          <p className="text-xs text-muted-foreground italic mt-1">{caption}</p>
        )}
        {!caption && !editing && (
          <p className="text-xs text-muted-foreground/50 italic mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para adicionar legenda e ajustar tamanho
          </p>
        )}
        {/* Delete button on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
          title="Remover imagem"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div
          className="mt-2 p-3 border rounded-lg bg-muted/50 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Legenda da imagem</label>
            <Input
              value={caption}
              onChange={(e) => updateAttributes({ 'data-caption': e.target.value })}
              placeholder="Ex: Imagem 1: Reunião Geral - Praça Floriano, nº 55"
              className="text-sm h-8"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Largura: {widthPct}%
            </label>
            <Slider
              value={[widthPct]}
              onValueChange={([v]) => updateAttributes({ 'data-width': v })}
              min={20}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-primary font-medium hover:underline"
          >
            Concluído
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// ── Custom Gallery NodeView ──
const GalleryView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
  const [editing, setEditing] = useState(false);
  const images: Array<{ src: string; caption: string }> = node.attrs.images || [];
  const columns = node.attrs.columns || 2;

  const updateImage = (index: number, caption: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], caption };
    updateAttributes({ images: updated });
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    if (updated.length === 0) {
      deleteNode();
    } else {
      updateAttributes({ images: updated });
    }
  };

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={cn(
          'relative group cursor-pointer',
          selected && 'ring-2 ring-primary/50 ring-offset-2 rounded'
        )}
        onClick={() => setEditing(true)}
      >
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative group/item">
              <img
                src={img.src}
                alt={img.caption || `Imagem ${i + 1}`}
                className="rounded-md w-full h-auto object-contain"
                draggable={false}
              />
              {img.caption && !editing && (
                <p className="text-xs text-muted-foreground italic mt-1 text-center">{img.caption}</p>
              )}
              {editing && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                  title="Remover imagem"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {!editing && (
          <p className="text-xs text-muted-foreground/50 italic mt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para editar legendas e layout da galeria
          </p>
        )}

        {/* Delete gallery button */}
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
          title="Remover galeria"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div
          className="mt-2 p-3 border rounded-lg bg-muted/50 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Colunas: {columns}
            </label>
            <Slider
              value={[columns]}
              onValueChange={([v]) => updateAttributes({ columns: v })}
              min={1}
              max={4}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Legendas</label>
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-2">
                <img src={img.src} className="h-10 w-10 object-cover rounded" alt="" />
                <Input
                  value={img.caption}
                  onChange={(e) => updateImage(i, e.target.value)}
                  placeholder={`Legenda da imagem ${i + 1}`}
                  className="text-sm h-8 flex-1"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setEditing(false)}
            className="text-xs text-primary font-medium hover:underline"
          >
            Concluído
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// ── Extended Image Extension ──
const CustomImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-caption': { default: '', parseHTML: el => el.getAttribute('data-caption') || '', renderHTML: attrs => ({ 'data-caption': attrs['data-caption'] || '' }) },
      'data-width': { default: 100, parseHTML: el => parseInt(el.getAttribute('data-width') || '100', 10), renderHTML: attrs => ({ 'data-width': String(attrs['data-width'] || 100) }) },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineImageView);
  },
});

// ── Gallery Node Extension ──
import { Node, mergeAttributes } from '@tiptap/core';

const GalleryNode = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (el: HTMLElement) => {
          try { return JSON.parse(el.getAttribute('data-images') || '[]'); } catch { return []; }
        },
        renderHTML: (attrs: Record<string, any>) => ({ 'data-images': JSON.stringify(attrs.images || []) }),
      },
      columns: {
        default: 2,
        parseHTML: (el: HTMLElement) => parseInt(el.getAttribute('data-columns') || '2', 10),
        renderHTML: (attrs: Record<string, any>) => ({ 'data-columns': String(attrs.columns || 2) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-gallery]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-gallery': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  enableImages?: boolean;
}

 export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
   ({ value, onChange, placeholder = 'Digite aqui...', className, enableImages = false }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline.configure({}),
      ...(enableImages ? [
        CustomImage.configure({ inline: false, allowBase64: false }),
        GalleryNode,
      ] : []),
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

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) { toast.error(`"${file.name}" não é uma imagem`); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error(`"${file.name}" é muito grande (máx. 10MB)`); return null; }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `inline/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('team-report-photos').upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(path);
    return urlData.publicUrl;
  }, []);

  // Single image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        editor.chain().focus().setImage({
          src: url,
          alt: 'Imagem inserida',
          'data-caption': '',
          'data-width': 80,
        } as any).run();
      }
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  }, [editor, uploadFile]);

  // Multiple images upload → gallery grid
  const handleGalleryUpload = useCallback(async (files: FileList) => {
    if (!editor || files.length === 0) return;
    setUploading(true);
    setUploadProgress(`Enviando 0/${files.length}...`);
    try {
      const urls: Array<{ src: string; caption: string }> = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Enviando ${i + 1}/${files.length}...`);
        try {
          const url = await uploadFile(files[i]);
          if (url) urls.push({ src: url, caption: '' });
        } catch (err) {
          console.error(`Erro ao enviar ${files[i].name}:`, err);
          toast.error(`Erro ao enviar "${files[i].name}"`);
        }
      }
      if (urls.length > 0) {
        const cols = urls.length === 1 ? 1 : urls.length <= 4 ? 2 : 3;
        editor.chain().focus().insertContent({
          type: 'gallery',
          attrs: { images: urls, columns: cols },
        }).run();
        toast.success(`${urls.length} imagem(ns) inserida(s) em galeria`);
      }
    } catch (err) {
      console.error('Erro na galeria:', err);
      toast.error('Erro ao enviar imagens');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [editor, uploadFile]);

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

        {enableImages && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            {/* Single image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = ''; }}
            />
            <Toggle
              size="sm"
              pressed={false}
              onPressedChange={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Inserir imagem"
              title="Inserir uma imagem"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </Toggle>

            {/* Multiple images → gallery */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleGalleryUpload(e.target.files); e.target.value = ''; }}
            />
            <Toggle
              size="sm"
              pressed={false}
              onPressedChange={() => galleryInputRef.current?.click()}
              disabled={uploading}
              aria-label="Inserir galeria de imagens"
              title="Inserir galeria/grid de múltiplas imagens"
            >
              <Grid2x2 className="h-4 w-4" />
            </Toggle>

            {uploadProgress && (
              <span className="text-xs text-muted-foreground ml-2 animate-pulse">{uploadProgress}</span>
            )}
          </>
        )}
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
