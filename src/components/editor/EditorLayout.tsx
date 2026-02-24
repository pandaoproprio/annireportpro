import React, { useState } from 'react';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { DocumentCanvas } from './DocumentCanvas';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { useDocumentModel } from './hooks/useDocumentModel';
import { useLayoutEngine } from './hooks/useLayoutEngine';
import { useExportEngine } from './hooks/useExportEngine';
import { useVersionHistory } from './hooks/useVersionHistory';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';

interface EditorLayoutProps {
  documentId?: string;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({ documentId }) => {
  const doc = useDocumentModel(documentId);
  const layoutEngine = useLayoutEngine(doc.model);
  const exportEngine = useExportEngine(doc.model, doc.title);
  const versionHistory = useVersionHistory(documentId);
  const [showVersions, setShowVersions] = useState(false);

  const handleRestore = (model: typeof doc.model) => {
    doc.updateModel(() => model);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-muted/30">
        <Toolbar
          onAddBlock={doc.addBlock}
          onAddPage={doc.addPage}
          onExportPdf={exportEngine.exportPdf}
          onExportDocx={exportEngine.exportDocx}
          isDirty={doc.isDirty}
          isSaving={doc.isSaving}
          title={doc.title}
          onToggleVersions={() => setShowVersions(v => !v)}
          showVersions={showVersions}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 overflow-auto">
            <div className="py-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => doc.setActivePageIndex(Math.max(0, doc.activePageIndex - 1))}
                  disabled={doc.activePageIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {doc.activePageIndex + 1} de {doc.model.pages.length}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => doc.setActivePageIndex(Math.min(doc.model.pages.length - 1, doc.activePageIndex + 1))}
                  disabled={doc.activePageIndex >= doc.model.pages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <DocumentCanvas
                page={doc.activePage}
                pageIndex={doc.activePageIndex}
                totalPages={doc.model.pages.length}
                layout={doc.model.layout}
                globalHeader={doc.model.globalHeader}
                globalFooter={doc.model.globalFooter}
                activeBlockId={doc.activeBlockId}
                onSelectBlock={doc.setActiveBlockId}
                onUpdateBlock={doc.updateBlock}
                onRemoveBlock={doc.removeBlock}
                onMoveBlock={doc.moveBlock}
                onReorderBlocks={doc.reorderBlocks}
                onSelectPage={() => doc.setActiveBlockId(null)}
              />
            </div>
          </div>

          {/* Properties or Version History panel */}
          {showVersions ? (
            <VersionHistoryPanel
              versions={versionHistory.versions}
              isLoading={versionHistory.isLoading}
              isSaving={versionHistory.isSaving}
              currentModel={doc.model}
              onSaveSnapshot={versionHistory.saveSnapshot}
              onRestore={handleRestore}
              onCompare={versionHistory.startCompare}
              comparingVersions={versionHistory.comparingVersions}
              onStopCompare={versionHistory.stopCompare}
            />
          ) : (
            <PropertiesPanel
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
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
