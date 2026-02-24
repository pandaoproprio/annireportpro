import { useMemo } from 'react';
import { DocumentModel, DocumentBlock, LayoutConfig } from '@/types/document';

export interface RenderedBlock {
  block: DocumentBlock;
  pageIndex: number;
  y: number;       // mm from top of page
  height: number;  // mm
}

/**
 * Layout engine: calculates vertical positions and automatic page breaks.
 * Returns a flat list of rendered blocks with their computed positions.
 */
export const useLayoutEngine = (model: DocumentModel) => {
  const { layout } = model;

  const contentAreaHeight = useMemo(() => {
    const headerH = model.globalHeader.enabled ? model.globalHeader.height + layout.headerSpacing : 0;
    const footerH = model.globalFooter.enabled ? model.globalFooter.height + layout.footerSpacing : 0;
    return layout.pageHeight - layout.marginTop - layout.marginBottom - headerH - footerH;
  }, [model.globalHeader, model.globalFooter, layout]);

  const contentStartY = useMemo(() => {
    const headerH = model.globalHeader.enabled ? model.globalHeader.height + layout.headerSpacing : 0;
    return layout.marginTop + headerH;
  }, [model.globalHeader, layout]);

  const estimateBlockHeight = (block: DocumentBlock): number => {
    switch (block.type) {
      case 'text': {
        // Rough estimation: ~5mm per line, ~80 chars per line at 12pt
        const contentLength = block.content.replace(/<[^>]*>/g, '').length;
        const contentWidth = (layout.pageWidth - layout.marginLeft - layout.marginRight) * (block.width / 100);
        const charsPerLine = Math.max(1, Math.floor(contentWidth / (block.fontSize * 0.22)));
        const lines = Math.max(1, Math.ceil(contentLength / charsPerLine));
        return lines * (block.fontSize * 0.353 * block.lineHeight) + block.marginTop + block.marginBottom + block.padding * 2;
      }
      case 'image':
        return block.displayHeight + block.marginTop + block.marginBottom + block.padding * 2 + (block.caption ? 6 : 0);
      case 'table': {
        const rowH = 8; // mm per row approx
        return block.rows * rowH + block.marginTop + block.marginBottom + block.padding * 2;
      }
      case 'spacer':
        return block.height + block.marginTop + block.marginBottom;
      default:
        return 10;
    }
  };

  const renderedBlocks = useMemo((): RenderedBlock[] => {
    const result: RenderedBlock[] = [];

    for (let pageIdx = 0; pageIdx < model.pages.length; pageIdx++) {
      const page = model.pages[pageIdx];
      let currentY = contentStartY;

      for (const block of page.blocks) {
        const blockH = estimateBlockHeight(block);

        // Check if block fits on current page
        if (currentY + blockH > contentStartY + contentAreaHeight && result.length > 0) {
          // Would overflow — in future phases this would auto-split to next page
          // For now, just continue (Phase 2 will handle auto page breaks)
        }

        result.push({
          block,
          pageIndex: pageIdx,
          y: currentY,
          height: blockH,
        });

        currentY += blockH;
      }
    }

    return result;
  }, [model.pages, contentStartY, contentAreaHeight]);

  return {
    renderedBlocks,
    contentAreaHeight,
    contentStartY,
    estimateBlockHeight,
    layout,
  };
};
