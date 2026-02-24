import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  sectionType?: 'goal' | 'summary' | 'other' | 'communication' | 'generic';
  /** For "generate" mode: activities data */
  activities?: any[];
  /** For "generate" mode */
  projectName?: string;
  projectObject?: string;
  goalTitle?: string;
  goalAudience?: string;
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
  disabled,
  hideGenerate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<AiMode | null>(null);

  const handleAiAction = async (mode: AiMode) => {
    if (mode !== 'generate' && (!text || text.trim().length < 10)) {
      toast.warning('Digite ao menos 10 caracteres para usar esta função.');
      return;
    }
    if (mode === 'generate' && (!activities || activities.length === 0) && !text) {
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
  const canGenerate = !hideGenerate && ((activities && activities.length > 0) || hasText);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isProcessing || disabled}
          className="gap-1.5 text-xs"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {currentMode === 'correct' ? 'Corrigindo...' :
               currentMode === 'rewrite' ? 'Reescrevendo...' :
               currentMode === 'expand' ? 'Expandindo...' :
               'Gerando...'}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              IA
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
  );
};
