import React, { useState } from 'react';
import { VersionEntry } from './hooks/useVersionHistory';
import { DocumentModel } from '@/types/document';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, GitCompare, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VersionHistoryPanelProps {
  versions: VersionEntry[];
  isLoading: boolean;
  isSaving: boolean;
  currentModel: DocumentModel;
  onSaveSnapshot: (model: DocumentModel) => void;
  onRestore: (model: DocumentModel) => void;
  onCompare: (a: VersionEntry, b: VersionEntry) => void;
  comparingVersions: [VersionEntry, VersionEntry] | null;
  onStopCompare: () => void;
}

/** Simple block-level diff summary */
const computeDiffSummary = (a: DocumentModel, b: DocumentModel) => {
  const aBlocks = a.pages.flatMap(p => p.blocks);
  const bBlocks = b.pages.flatMap(p => p.blocks);
  const aIds = new Set(aBlocks.map(bl => bl.id));
  const bIds = new Set(bBlocks.map(bl => bl.id));

  const added = bBlocks.filter(bl => !aIds.has(bl.id)).length;
  const removed = aBlocks.filter(bl => !bIds.has(bl.id)).length;
  const common = aBlocks.filter(bl => bIds.has(bl.id));
  const modified = common.filter(bl => {
    const other = bBlocks.find(ob => ob.id === bl.id);
    return JSON.stringify(bl) !== JSON.stringify(other);
  }).length;

  return { added, removed, modified, pagesA: a.pages.length, pagesB: b.pages.length };
};

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  versions, isLoading, isSaving, currentModel,
  onSaveSnapshot, onRestore, onCompare,
  comparingVersions, onStopCompare,
}) => {
  const [selectedForCompare, setSelectedForCompare] = useState<string | null>(null);
  const [expandedDiff, setExpandedDiff] = useState(false);

  const diff = comparingVersions
    ? computeDiffSummary(comparingVersions[0].content_snapshot, comparingVersions[1].content_snapshot)
    : null;

  return (
    <div className="w-72 border-l bg-background flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Versões
          </h3>
          <Button
            variant="default" size="sm" className="h-7 text-xs gap-1"
            onClick={() => onSaveSnapshot(currentModel)}
            disabled={isSaving}
          >
            <Save className="h-3 w-3" /> {isSaving ? 'Salvando...' : 'Snapshot'}
          </Button>
        </div>
        {selectedForCompare && (
          <p className="text-[10px] text-muted-foreground">
            Selecione outra versão para comparar
          </p>
        )}
      </div>

      {/* Diff comparison bar */}
      {comparingVersions && diff && (
        <div className="p-3 border-b bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              v{comparingVersions[0].version_number} → v{comparingVersions[1].version_number}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onStopCompare}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {diff.added > 0 && <Badge variant="default" className="text-[10px]">+{diff.added} adicionados</Badge>}
            {diff.removed > 0 && <Badge variant="destructive" className="text-[10px]">-{diff.removed} removidos</Badge>}
            {diff.modified > 0 && <Badge variant="secondary" className="text-[10px]">{diff.modified} modificados</Badge>}
            {diff.pagesA !== diff.pagesB && (
              <Badge variant="outline" className="text-[10px]">{diff.pagesA} → {diff.pagesB} páginas</Badge>
            )}
            {diff.added === 0 && diff.removed === 0 && diff.modified === 0 && diff.pagesA === diff.pagesB && (
              <span className="text-[10px] text-muted-foreground">Sem diferenças</span>
            )}
          </div>
          <Button
            variant="ghost" size="sm" className="h-6 text-[10px] gap-1 w-full"
            onClick={() => setExpandedDiff(!expandedDiff)}
          >
            {expandedDiff ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expandedDiff ? 'Ocultar detalhes' : 'Ver detalhes'}
          </Button>
          {expandedDiff && (
            <div className="text-[10px] space-y-1 max-h-40 overflow-y-auto">
              {comparingVersions[1].content_snapshot.pages.flatMap((page, pi) =>
                page.blocks.map(block => {
                  const oldBlock = comparingVersions[0].content_snapshot.pages
                    .flatMap(p => p.blocks)
                    .find(b => b.id === block.id);
                  if (!oldBlock) return (
                    <div key={block.id} className="text-primary">+ [{block.type}] pág.{pi + 1}</div>
                  );
                  if (JSON.stringify(oldBlock) !== JSON.stringify(block)) return (
                    <div key={block.id} className="text-accent-foreground">~ [{block.type}] pág.{pi + 1}</div>
                  );
                  return null;
                })
              )}
              {comparingVersions[0].content_snapshot.pages.flatMap(page =>
                page.blocks
                  .filter(b => !comparingVersions[1].content_snapshot.pages.flatMap(p => p.blocks).find(ob => ob.id === b.id))
                  .map(block => (
                    <div key={block.id} className="text-destructive">- [{block.type}] removido</div>
                  ))
              )}
            </div>
          )}
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1 w-full"
            onClick={() => {
              onRestore(comparingVersions[0].content_snapshot);
              onStopCompare();
            }}
          >
            <RotateCcw className="h-3 w-3" /> Restaurar v{comparingVersions[0].version_number}
          </Button>
        </div>
      )}

      {/* Version list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
          {!isLoading && versions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum snapshot salvo ainda. Clique em "Snapshot" para criar o primeiro.
            </p>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              className={`p-2 rounded border text-xs space-y-1.5 ${
                selectedForCompare === v.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Versão {v.version_number}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(v.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {v.content_snapshot.pages.length} pág. · {v.content_snapshot.pages.reduce((s, p) => s + p.blocks.length, 0)} blocos
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5 flex-1"
                  onClick={() => {
                    onRestore(v.content_snapshot);
                  }}
                >
                  <RotateCcw className="h-3 w-3" /> Restaurar
                </Button>
                <Button
                  variant={selectedForCompare === v.id ? 'default' : 'ghost'}
                  size="sm" className="h-6 text-[10px] gap-0.5 flex-1"
                  onClick={() => {
                    if (selectedForCompare === null) {
                      setSelectedForCompare(v.id);
                    } else if (selectedForCompare === v.id) {
                      setSelectedForCompare(null);
                    } else {
                      const other = versions.find(ver => ver.id === selectedForCompare);
                      if (other) {
                        onCompare(other, v);
                        setSelectedForCompare(null);
                      }
                    }
                  }}
                >
                  <GitCompare className="h-3 w-3" /> Comparar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
