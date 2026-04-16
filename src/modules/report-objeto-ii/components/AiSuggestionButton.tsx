import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SECTION_EXAMPLES } from '../knowledgeBase';
import { toast } from 'sonner';

interface Props {
  sectionKey: string;
  currentContent: string;
  projectName: string;
  onAccept: (text: string) => void;
}

export const AiSuggestionButton: React.FC<Props> = ({ sectionKey, currentContent, projectName, onAccept }) => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestion(null);

    const sectionInfo = SECTION_EXAMPLES[sectionKey];
    if (!sectionInfo) {
      toast.error('Seção não reconhecida.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-narrative', {
        body: {
          prompt: `Você é um redator institucional do CEAP (Centro de Articulação de Populações Marginalizadas). Gere um texto narrativo para a seção "${sectionKey}" de um Relatório de Cumprimento do Objeto do projeto "${projectName}".

ORIENTAÇÃO DA SEÇÃO: ${sectionInfo.guidance}

EXEMPLOS DE REFERÊNCIA (textos reais de outros relatórios do CEAP):
${sectionInfo.examples.map((ex, i) => `--- Exemplo ${i + 1} ---\n${ex}`).join('\n\n')}

${currentContent ? `CONTEÚDO ATUAL DO USUÁRIO (use como base e melhore):\n${currentContent}` : 'O campo está vazio. Crie um texto inicial sugerido.'}

REGRAS:
- Linguagem formal e objetiva, tom institucional
- Não invente dados específicos (datas, nomes, números) — use marcadores como [inserir data], [inserir nome], [número de participantes]
- Mantenha a estrutura e o padrão dos exemplos de referência
- Texto em português brasileiro
- Retorne APENAS o texto narrativo, sem formatação markdown`,
          max_tokens: 1000,
        },
      });

      if (error) throw error;

      const text = typeof data === 'string' ? data : data?.text || data?.narrative || '';
      if (!text) throw new Error('Resposta vazia');

      setSuggestion(text);
    } catch (err) {
      console.error('AI suggestion error:', err);
      toast.error('Erro ao gerar sugestão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
      toast.success('Sugestão aplicada!');
    }
  };

  const handleDiscard = () => {
    setSuggestion(null);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className="border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 gap-2 text-sm font-medium shadow-sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Lightbulb className="w-4 h-4" />
        )}
        {loading ? 'Gerando sugestão...' : '💡 Sugerir com IA'}
      </Button>

      {suggestion && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Lightbulb className="w-3.5 h-3.5" />
            Sugestão da IA
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{suggestion}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={handleAccept} className="gap-1 text-xs h-7">
              <Check className="w-3 h-3" /> Aceitar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDiscard} className="gap-1 text-xs h-7 text-muted-foreground">
              <X className="w-3 h-3" /> Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
