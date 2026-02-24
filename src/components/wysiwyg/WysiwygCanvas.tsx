import React, { useMemo, useCallback } from 'react';
import { DocumentPage, DocumentBlock, LayoutConfig, HeaderFooterConfig } from '@/types/document';
import { StructuredRichContent, structuredToHtml, htmlToStructured, createDefaultStructuredContent, VARIABLE_LABELS, RichTextVariable } from '@/types/richText';
import { WysiwygBlockRenderer } from './WysiwygBlockRenderer';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Hash } from 'lucide-react';

const MM_TO_PX = 3.78;

// ── Inline Sortable wrapper ──
const SortableItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative' }}
      {...attributes}
    >
      <div {...listeners} className="absolute -left-9 top-0 w-6 h-6 cursor-grab z-20" style={{ touchAction: 'none' }} />
      {children}
    </div>
  );
};

// ── Variable insertion button ──
const VariableInsertButton: React.FC<{
  onInsert: (variable: RichTextVariable['variable']) => void;
}> = ({ onInsert }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100">
        <Hash className="h-3 w-3" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-48 p-1" align="start">
      <div className="space-y-0.5">
        {(Object.entries(VARIABLE_LABELS) as [RichTextVariable['variable'], string][]).map(([key, label]) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-xs"
            onClick={() => onInsert(key)}
          >
            <Badge variant="secondary" className="text-[10px] mr-1.5">{`{{${key}}}`}</Badge>
            {label}
          </Button>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

// ── Inline Header/Footer editor with structured model ──
const InlineStructuredEditor: React.FC<{
  config: HeaderFooterConfig;
  onUpdate: (updates: Partial<HeaderFooterConfig>) => void;
  placeholder: string;
  pageIndex: number;
  totalPages: number;
  title: string;
}> = ({ config, onUpdate, placeholder, pageIndex, totalPages, title }) => {
  const structured = config.structuredContent ?? createDefaultStructuredContent(config.height);
  const context = { pageNumber: pageIndex + 1, totalPages, title };
  const initialHtml = structuredToHtml(structured, context);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false }), Underline],
    content: initialHtml || `<p>${placeholder}</p>`,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      const newStructured = htmlToStructured(html, structured.height);
      onUpdate({
        content: html,
        structuredContent: newStructured,
      });
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[1em] w-full text-xs',
        style: `font-size: ${config.fontSize}pt; font-family: ${config.fontFamily}; text-align: ${config.alignment}`,
      },
    },
  });

  const handleInsertVariable = useCallback((variable: RichTextVariable['variable']) => {
    if (!editor) return;
    const resolved = variable === 'pageNumber' ? `{{${variable}}}` :
                     variable === 'totalPages' ? `{{${variable}}}` :
                     variable === 'date' ? new Date().toLocaleDateString('pt-BR') :
                     `{{${variable}}}`;
    editor.chain().focus().insertContent(
      `<span data-variable="${variable}" class="variable">${resolved}</span>`
    ).run();
  }, [editor]);

  return (
    <div className="flex items-center w-full gap-1" style={{ justifyContent: config.alignment === 'left' ? 'flex-start' : config.alignment === 'right' ? 'flex-end' : 'center' }}>
      {config.imageUrl && (
        <img src={config.imageUrl} alt="" style={{ maxHeight: config.height * MM_TO_PX * 0.8, objectFit: 'contain', marginRight: 8 }} />
      )}
      <div className="flex-1 min-w-0">
        <EditorContent editor={editor} />
      </div>
      <VariableInsertButton onInsert={handleInsertVariable} />
    </div>
  );
};

// ── Page break indicator ──
const PageBreakIndicator: React.FC<{ pageNumber: number }> = ({ pageNumber }) => (
  <div className="relative my-4 flex items-center justify-center">
    <div className="absolute inset-x-0 border-t-2 border-dashed border-muted-foreground/20" />
    <span className="relative bg-muted/30 px-3 py-0.5 text-[10px] text-muted-foreground font-medium rounded-full">
      Quebra de página — Página {pageNumber + 1}
    </span>
  </div>
);

interface WysiwygCanvasProps {
  pages: DocumentPage[];
  layout: LayoutConfig;
  globalHeader: HeaderFooterConfig;
  globalFooter: HeaderFooterConfig;
  activeBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<DocumentBlock>) => void;
  onRemoveBlock: (id: string) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
  onDeselectBlock: () => void;
  onUpdateGlobalHeader: (updates: Partial<HeaderFooterConfig>) => void;
  onUpdateGlobalFooter: (updates: Partial<HeaderFooterConfig>) => void;
  documentTitle: string;
}

export const WysiwygCanvas: React.FC<WysiwygCanvasProps> = ({
  pages, layout, globalHeader, globalFooter,
  activeBlockId, onSelectBlock, onUpdateBlock, onRemoveBlock,
  onReorderBlocks, onDeselectBlock,
  onUpdateGlobalHeader, onUpdateGlobalFooter,
  documentTitle,
}) => {
  const pageW = layout.pageWidth * MM_TO_PX;
  const pageH = layout.pageHeight * MM_TO_PX;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) onReorderBlocks(String(active.id), String(over.id));
  };

  const allBlockIds = pages.flatMap(p => p.blocks.map(b => b.id));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={allBlockIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col items-center py-8 gap-0">
          {pages.map((page, pi) => {
            const header = page.header ?? globalHeader;
            const footer = page.footer ?? globalFooter;

            return (
              <React.Fragment key={page.id}>
                {pi > 0 && <PageBreakIndicator pageNumber={pi} />}
                <div
                  className="bg-white shadow-lg relative overflow-hidden"
                  style={{ width: pageW, minHeight: pageH }}
                  onClick={(e) => { if (e.target === e.currentTarget) onDeselectBlock(); }}
                >
                  {/* Margin guides */}
                  <div
                    className="absolute border border-dashed border-primary/10 pointer-events-none"
                    style={{
                      top: layout.marginTop * MM_TO_PX,
                      left: layout.marginLeft * MM_TO_PX,
                      right: layout.marginRight * MM_TO_PX,
                      bottom: layout.marginBottom * MM_TO_PX,
                    }}
                  />

                  {/* Header — editable inline with structured model */}
                  {header.enabled && (
                    <div
                      className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/15 cursor-text"
                      style={{
                        top: 0,
                        height: (layout.marginTop + header.height) * MM_TO_PX,
                        paddingLeft: layout.marginLeft * MM_TO_PX,
                        paddingRight: layout.marginRight * MM_TO_PX,
                        paddingTop: layout.marginTop * MM_TO_PX * 0.3,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <InlineStructuredEditor
                        config={header}
                        onUpdate={onUpdateGlobalHeader}
                        placeholder="Cabeçalho — clique para editar"
                        pageIndex={pi}
                        totalPages={pages.length}
                        title={documentTitle}
                      />
                    </div>
                  )}

                  {/* Content area */}
                  <div
                    style={{
                      paddingTop: (layout.marginTop + (header.enabled ? header.height + layout.headerSpacing : 0)) * MM_TO_PX,
                      paddingBottom: (layout.marginBottom + (footer.enabled ? footer.height + layout.footerSpacing : 0)) * MM_TO_PX,
                      paddingLeft: layout.marginLeft * MM_TO_PX,
                      paddingRight: layout.marginRight * MM_TO_PX,
                      minHeight: pageH,
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) onDeselectBlock(); }}
                  >
                    {page.blocks.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        Clique nos botões acima para adicionar blocos
                      </div>
                    ) : (
                      <div className="space-y-1 pl-10">
                        {page.blocks.map(block => (
                          <SortableItem key={block.id} id={block.id}>
                            <WysiwygBlockRenderer
                              block={block}
                              isActive={activeBlockId === block.id}
                              onSelect={() => onSelectBlock(block.id)}
                              onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                              onRemove={() => onRemoveBlock(block.id)}
                            />
                          </SortableItem>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer — editable inline with structured model */}
                  {footer.enabled && (
                    <div
                      className="absolute left-0 right-0 bottom-0 border-t border-dashed border-muted-foreground/15 cursor-text"
                      style={{
                        height: (layout.marginBottom + footer.height) * MM_TO_PX,
                        paddingLeft: layout.marginLeft * MM_TO_PX,
                        paddingRight: layout.marginRight * MM_TO_PX,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <InlineStructuredEditor
                        config={footer}
                        onUpdate={onUpdateGlobalFooter}
                        placeholder="Rodapé — clique para editar"
                        pageIndex={pi}
                        totalPages={pages.length}
                        title={documentTitle}
                      />
                    </div>
                  )}

                  {/* ABNT page number — top-right, 2cm from edges */}
                  <div
                    className="absolute pointer-events-none text-muted-foreground"
                    style={{
                      top: 20 * MM_TO_PX * 0.5,
                      right: 20 * MM_TO_PX,
                      fontSize: '10pt',
                      fontFamily: 'Times New Roman',
                    }}
                  >
                    {pi + 1}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};
