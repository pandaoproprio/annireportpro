import React from 'react';
import { WysiwygCanvas } from './WysiwygCanvas';
import { WysiwygToolbar } from './WysiwygToolbar';
import { WysiwygPropertiesPanel } from './WysiwygPropertiesPanel';
import { useDocumentModel } from '@/components/editor/hooks/useDocumentModel';
import { useExportEngine } from '@/components/editor/hooks/useExportEngine';
import { useYjsCollaboration } from '@/hooks/useYjsCollaboration';
import { CollaborationPresenceBar } from '@/components/CollaborationPresenceBar';
import { TooltipProvider } from '@/components/ui/tooltip';

interface Props {
  documentId?: string;
}

export const WysiwygEditor: React.FC<Props> = ({ documentId }) => {
  const doc = useDocumentModel(documentId);
  const exportEngine = useExportEngine(doc.model, doc.title);

  // Yjs collaboration — enabled when we have a documentId
  const { ydoc, awareness, connected } = useYjsCollaboration({
    channelKey: documentId ? `doc:${documentId}` : '',
    enabled: !!documentId,
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-muted/30">
        <WysiwygToolbar
          onAddBlock={doc.addBlock}
          onAddPage={doc.addPage}
          onExportPdf={exportEngine.exportPdf}
          onExportDocx={exportEngine.exportDocx}
          isDirty={doc.isDirty}
          isSaving={doc.isSaving}
          title={doc.title}
        />

        {/* Collaboration presence indicator */}
        {connected && awareness && (
          <div className="px-4 py-1 bg-muted/50 border-b flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Edição colaborativa ativa (Yjs CRDT)</span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas area — scrollable, center-aligned */}
          <div className="flex-1 overflow-auto bg-muted/40">
            <WysiwygCanvas
              pages={doc.model.pages}
              layout={doc.model.layout}
              globalHeader={doc.model.globalHeader}
              globalFooter={doc.model.globalFooter}
              activeBlockId={doc.activeBlockId}
              onSelectBlock={doc.setActiveBlockId}
              onUpdateBlock={doc.updateBlock}
              onRemoveBlock={doc.removeBlock}
              onReorderBlocks={doc.reorderBlocks}
              onDeselectBlock={() => doc.setActiveBlockId(null)}
              onUpdateGlobalHeader={doc.updateGlobalHeader}
              onUpdateGlobalFooter={doc.updateGlobalFooter}
              documentTitle={doc.title}
              ydoc={ydoc}
              awareness={awareness}
            />
          </div>

          {/* Properties panel */}
          <WysiwygPropertiesPanel
            activeBlock={doc.activeBlock}
            onUpdateBlock={(updates) => {
              if (doc.activeBlockId) doc.updateBlock(doc.activeBlockId, updates);
            }}
            layout={doc.model.layout}
            onUpdateLayout={doc.updateLayout}
            globalHeader={doc.model.globalHeader}
            onUpdateGlobalHeader={doc.updateGlobalHeader}
            globalFooter={doc.model.globalFooter}
            onUpdateGlobalFooter={doc.updateGlobalFooter}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};
