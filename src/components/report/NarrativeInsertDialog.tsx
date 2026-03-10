import React, { useState } from 'react';
import { useActivityNarratives, type ActivityNarrative } from '@/hooks/useActivityNarratives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, FileText, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface NarrativeInsertDialogProps {
  projectId: string;
  reportType: string;
  onInsert: (text: string) => void;
  triggerLabel?: string;
}

export const NarrativeInsertDialog: React.FC<NarrativeInsertDialogProps> = ({
  projectId,
  reportType,
  onInsert,
  triggerLabel = 'Inserir Narrativas',
}) => {
  const { getApprovedNarratives, narratives } = useActivityNarratives(projectId);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const approved = getApprovedNarratives(reportType);
  const allWithTarget = narratives.filter(n => n.target_reports.includes(reportType));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInsert = () => {
    const selected = approved.filter(n => selectedIds.has(n.id));
    if (selected.length === 0) {
      toast.warning('Selecione ao menos uma narrativa aprovada');
      return;
    }
    const combined = selected.map(n => n.narrative_text).join('\n\n');
    onInsert(combined);
    setOpen(false);
    setSelectedIds(new Set());
    toast.success(`${selected.length} narrativa(s) inserida(s)`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {triggerLabel}
          {approved.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
              {approved.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Narrativas Institucionais Aprovadas
          </DialogTitle>
        </DialogHeader>

        {approved.length === 0 ? (
          <div className="py-8 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {allWithTarget.length > 0
                ? `${allWithTarget.length} narrativa(s) encontrada(s), mas nenhuma aprovada para este tipo de relatório.`
                : 'Nenhuma narrativa gerada para este relatório. Gere narrativas a partir do Diário de Bordo.'}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3 pr-4">
                {approved.map(n => (
                  <div
                    key={n.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedIds.has(n.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                    onClick={() => toggleSelect(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedIds.has(n.id)}
                        onCheckedChange={() => toggleSelect(n.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed line-clamp-4">{n.narrative_text}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                            <Check className="w-2.5 h-2.5 mr-0.5" /> Aprovada
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {selectedIds.size} de {approved.length} selecionada(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set(approved.map(n => n.id)))}
                >
                  Selecionar todas
                </Button>
                <Button size="sm" onClick={handleInsert} disabled={selectedIds.size === 0} className="gap-1">
                  <Copy className="w-3.5 h-3.5" /> Inserir no Relatório
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
