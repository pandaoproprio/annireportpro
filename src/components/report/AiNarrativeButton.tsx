import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  sectionType: 'goal' | 'summary' | 'other' | 'communication';
  activities: any[];
  projectName: string;
  projectObject: string;
  goalTitle?: string;
  goalAudience?: string;
  onGenerated: (text: string) => void;
  disabled?: boolean;
}

export const AiNarrativeButton: React.FC<Props> = ({
  sectionType,
  activities,
  projectName,
  projectObject,
  goalTitle,
  goalAudience,
  onGenerated,
  disabled,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (activities.length === 0) {
      toast.warning('Nenhuma atividade vinculada para gerar narrativa.');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-narrative', {
        body: {
          sectionType,
          activities: activities.map(a => ({
            date: new Date(a.date).toLocaleDateString('pt-BR'),
            type: a.type,
            description: a.description,
            results: a.results,
            challenges: a.challenges,
            attendeesCount: a.attendeesCount,
          })),
          projectName,
          projectObject,
          goalTitle,
          goalAudience,
        },
      });

      if (error) throw error;

      if (data?.text) {
        onGenerated(data.text);
        toast.success('Narrativa gerada com sucesso!');
      } else {
        toast.error('Nenhum texto foi gerado.');
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error('Erro ao gerar narrativa. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating || disabled || activities.length === 0}
      className="gap-1.5 text-xs"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" />
          Gerar com IA
        </>
      )}
    </Button>
  );
};
