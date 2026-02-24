import React from 'react';
import { DocumentPage, DocumentBlock, LayoutConfig, HeaderFooterConfig } from '@/types/document';
import { BlockRenderer } from './BlockRenderer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableBlock } from './SortableBlock';

interface DocumentCanvasProps {
  page: DocumentPage;
  pageIndex: number;
  totalPages: number;
  layout: LayoutConfig;
  globalHeader: HeaderFooterConfig;
  globalFooter: HeaderFooterConfig;
  activeBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<DocumentBlock>) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
  onSelectPage: () => void;
}

const MM_TO_PX = 3.78;

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  page, pageIndex, totalPages, layout, globalHeader, globalFooter,
  activeBlockId, onSelectBlock, onUpdateBlock, onRemoveBlock, onMoveBlock,
  onReorderBlocks, onSelectPage,
}) => {
  const pageW = layout.pageWidth * MM_TO_PX;
  const pageH = layout.pageHeight * MM_TO_PX;
  const header = page.header ?? globalHeader;
  const footer = page.footer ?? globalFooter;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderBlocks(String(active.id), String(over.id));
    }
  };

  const blockIds = page.blocks.map(b => b.id);

  return (
    <div
      className="bg-white shadow-lg mx-auto mb-8 relative overflow-hidden"
      style={{ width: pageW, minHeight: pageH }}
      onClick={onSelectPage}
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

      {/* Header area */}
      {header.enabled && (
        <div
          className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/20 flex items-center"
          style={{
            top: 0,
            height: (layout.marginTop + header.height) * MM_TO_PX,
            paddingLeft: layout.marginLeft * MM_TO_PX,
            paddingRight: layout.marginRight * MM_TO_PX,
            justifyContent: header.alignment === 'left' ? 'flex-start' : header.alignment === 'right' ? 'flex-end' : 'center',
          }}
        >
          {header.imageUrl ? (
            <img src={header.imageUrl} alt="Header" style={{ maxHeight: header.height * MM_TO_PX * 0.9, objectFit: 'contain' }} />
          ) : (
            <div
              className="text-xs text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: header.content || '<em>Cabeçalho</em>' }}
            />
          )}
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
      >
        {page.blocks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            Clique nos botões acima para adicionar blocos
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 pl-10">
                {page.blocks.map(block => (
                  <SortableBlock key={block.id} id={block.id}>
                    <BlockRenderer
                      block={block}
                      isActive={activeBlockId === block.id}
                      onSelect={() => onSelectBlock(block.id)}
                      onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                      onRemove={() => onRemoveBlock(block.id)}
                      onMove={(dir) => onMoveBlock(block.id, dir)}
                    />
                  </SortableBlock>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer area */}
      {footer.enabled && (
        <div
          className="absolute left-0 right-0 bottom-0 border-t border-dashed border-muted-foreground/20 flex items-center"
          style={{
            height: (layout.marginBottom + footer.height) * MM_TO_PX,
            paddingLeft: layout.marginLeft * MM_TO_PX,
            paddingRight: layout.marginRight * MM_TO_PX,
            justifyContent: footer.alignment === 'left' ? 'flex-start' : footer.alignment === 'right' ? 'flex-end' : 'center',
          }}
        >
          <div
            className="text-xs text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: footer.content || '<em>Rodapé</em>' }}
          />
        </div>
      )}

      {/* Page number */}
      <div className="absolute bottom-2 right-4 text-xs text-muted-foreground">
        Página {pageIndex + 1} de {totalPages}
      </div>
    </div>
  );
};
