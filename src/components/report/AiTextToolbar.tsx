import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, CheckCheck, PenLine, Expand, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AiMode = 'generate' | 'correct' | 'rewrite' | 'expand';

interface AiTextToolbarProps {
  /** Current text content to process */
  text: string;
  /** Callback when AI produces result */
  onResult: (text: string) => void;
  /** For "generate" mode: section type */
  sectionType?: 'goal' | 'summary' | 'other' | 'communication' | 'generic' | 'results' | 'challenges';
  /** For "generate" mode: activities data */
  activities?: any[];
  /** For "generate" mode */
  projectName?: string;
  projectObject?: string;
  goalTitle?: string;
  goalAudience?: string;
  /** Optional context (e.g. activity description) used to derive results/challenges */
  descriptionContext?: string;
  /** Whether the toolbar is disabled */
  disabled?: boolean;
  /** Hide generate option (e.g. when no activities are available) */
  hideGenerate?: boolean;
}

export const AiTextToolbar: React.FC<AiTextToolbarProps> = ({
  text,
  onResult,
  sectionType,
  activities,
  projectName,
  projectObject,
  goalTitle,
  goalAudience,
  descriptionContext,
  disabled,
  hideGenerate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<AiMode | null>(null);
  const [pendingNarrative, setPendingNarrative] = useState<{ generated: string; original: string } | null>(null);

  const combineNarratives = (generated: string, original: string) => {
    const cleanGenerated = generated.trim();
    const cleanOriginal = original.trim();
    return cleanOriginal ? `${cleanGenerated}\n\n${cleanOriginal}` : cleanGenerated;
  };

  const handleNarrativeChoice = (choice: 'replace' | 'keep-both') => {
    if (!pendingNarrative) return;
    const result = choice === 'replace'
      ? pendingNarrative.generated.trim()
      : combineNarratives(pendingNarrative.generated, pendingNarrative.original);
    onResult(result);
    setPendingNarrative(null);
    toast.success('Narrativa aplicada com sucesso!');
  };

  const handleAiAction = async (mode: AiMode) => {
    const hasDescriptionCtx = !!(descriptionContext && descriptionContext.trim().length >= 10);
    if (mode !== 'generate' && (!text || text.trim().length < 10)) {
      toast.warning('Digite ao menos 10 caracteres para usar esta função.');
      return;
    }
    if (mode === 'generate' && (!activities || activities.length === 0) && !text && !hasDescriptionCtx) {
      toast.warning('Nenhuma atividade ou texto disponível para gerar narrativa.');
      return;
    }

    setIsProcessing(true);
    setCurrentMode(mode);

    try {
      const body: any = { mode };

      if (mode === 'generate') {
        body.sectionType = sectionType || 'generic';
        body.activities = (activities || []).map((a: any) => ({
          date: typeof a.date === 'string' ? (a.date.includes('T') ? new Date(a.date).toLocaleDateString('pt-BR') : a.date) : new Date(a.date).toLocaleDateString('pt-BR'),
          type: a.type,
          description: a.description,
          results: a.results,
          challenges: a.challenges,
          attendeesCount: a.attendeesCount,
        }));
        body.projectName = projectName;
        body.projectObject = projectObject;
        body.goalTitle = goalTitle;
        body.goalAudience = goalAudience;
        if (descriptionContext) body.descriptionContext = descriptionContext;
        if (text) body.text = text;
      } else {
        body.text = text;
      }

      const { data, error } = await supabase.functions.invoke('generate-narrative', { body });

      if (error) {
        // Check for specific HTTP errors from edge function
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          toast.error('Limite de requisições excedido. Aguarde alguns segundos.');
        } else if (error.message?.includes('402')) {
          toast.error('Créditos de IA esgotados. Adicione créditos ao workspace.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.text) {
        if (mode === 'generate') {
          setPendingNarrative({ generated: data.text, original: text || '' });
          toast.success('Narrativa gerada. Escolha como aplicar.');
          return;
        }

        onResult(data.text);
        const labels: Record<AiMode, string> = {
          generate: 'Narrativa gerada',
          correct: 'Texto corrigido',
          rewrite: 'Texto reescrito',
          expand: 'Texto expandido',
        };
        toast.success(`${labels[mode]} com sucesso!`);
      } else {
        toast.error('Nenhum texto foi gerado.');
      }
    } catch (err: any) {
      console.error('AI action error:', err);
      toast.error('Erro ao processar com IA. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setCurrentMode(null);
    }
  };

  const hasText = text && text.trim().length >= 10;
  const hasDescriptionCtx = !!(descriptionContext && descriptionContext.trim().length >= 10);
  const canGenerate = !hideGenerate && ((activities && activities.length > 0) || hasText || hasDescriptionCtx);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing || disabled}
            className="gap-2 text-sm font-medium whitespace-nowrap border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {currentMode === 'correct' ? 'Corrigindo...' :
                 currentMode === 'rewrite' ? 'Reescrevendo...' :
                 currentMode === 'expand' ? 'Expandindo...' :
                 'Gerando...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                💡 Sugerir com IA
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {canGenerate && (
            <>
              <DropdownMenuItem onClick={() => handleAiAction('generate')} disabled={isProcessing}>
                <Wand2 className="w-4 h-4 mr-2" />
                Gerar narrativa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => handleAiAction('correct')} disabled={isProcessing || !hasText}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Corrigir gramática
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAiAction('rewrite')} disabled={isProcessing || !hasText}>
            <PenLine className="w-4 h-4 mr-2" />
            Reescrever formal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAiAction('expand')} disabled={isProcessing || !hasText}>
            <Expand className="w-4 h-4 mr-2" />
            Expandir texto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!pendingNarrative} onOpenChange={(open) => !open && setPendingNarrative(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Como aplicar a narrativa?</DialogTitle>
            <DialogDescription>
              Escolha uma opção antes de salvar a narrativa gerada.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {pendingNarrative?.generated}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleNarrativeChoice('replace')}>
              Substituir
            </Button>
            <Button type="button" onClick={() => handleNarrativeChoice('keep-both')}>
              Manter os dois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
