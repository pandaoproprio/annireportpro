import React from 'react';
import { DocumentPage, DocumentBlock, LayoutConfig, HeaderFooterConfig } from '@/types/document';
import { BlockRenderer } from './BlockRenderer';

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
  onSelectPage: () => void;
}

// Scale factor: mm to px for screen display
const MM_TO_PX = 3.78; // ~96dpi

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  page, pageIndex, totalPages, layout, globalHeader, globalFooter,
  activeBlockId, onSelectBlock, onUpdateBlock, onRemoveBlock, onMoveBlock,
  onSelectPage,
}) => {
  const pageW = layout.pageWidth * MM_TO_PX;
  const pageH = layout.pageHeight * MM_TO_PX;
  const header = page.header ?? globalHeader;
  const footer = page.footer ?? globalFooter;

  return (
    <div
      className="bg-white shadow-lg mx-auto mb-8 relative overflow-hidden"
      style={{
        width: pageW,
        minHeight: pageH,
        // Show margins as visual guides
      }}
      onClick={onSelectPage}
    >
      {/* Margin guides */}
      <div
        className="absolute border border-dashed border-blue-200/40 pointer-events-none"
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
          className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/20 flex items-center px-4"
          style={{
            top: 0,
            height: (layout.marginTop + header.height) * MM_TO_PX,
            paddingLeft: layout.marginLeft * MM_TO_PX,
            paddingRight: layout.marginRight * MM_TO_PX,
            justifyContent: header.alignment === 'left' ? 'flex-start' : header.alignment === 'right' ? 'flex-end' : 'center',
          }}
        >
          <span className="text-xs text-muted-foreground italic">
            {header.content || 'Cabeçalho'}
          </span>
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
          <div className="space-y-1 pl-10">
            {page.blocks.map(block => (
              <BlockRenderer
                key={block.id}
                block={block}
                isActive={activeBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                onRemove={() => onRemoveBlock(block.id)}
                onMove={(dir) => onMoveBlock(block.id, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer area */}
      {footer.enabled && (
        <div
          className="absolute left-0 right-0 bottom-0 border-t border-dashed border-muted-foreground/20 flex items-center px-4"
          style={{
            height: (layout.marginBottom + footer.height) * MM_TO_PX,
            paddingLeft: layout.marginLeft * MM_TO_PX,
            paddingRight: layout.marginRight * MM_TO_PX,
            justifyContent: footer.alignment === 'left' ? 'flex-start' : footer.alignment === 'right' ? 'flex-end' : 'center',
          }}
        >
          <span className="text-xs text-muted-foreground italic">
            {footer.content || 'Rodapé'}
          </span>
        </div>
      )}

      {/* Page number */}
      <div className="absolute bottom-2 right-4 text-xs text-muted-foreground">
        Página {pageIndex + 1} de {totalPages}
      </div>
    </div>
  );
};
