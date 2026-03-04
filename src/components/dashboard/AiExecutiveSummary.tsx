import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectData {
  name: string;
  organization: string;
  fomento: string;
  funder: string;
  startDate: string;
  endDate: string;
  daysRemaining: number | string;
  totalActivities: number;
  totalAttendees: number;
  goalsCount: number;
  activitiesByType: Record<string, number>;
  activitiesByGoal: Record<string, number>;
  locations: string[];
  slaOnTime: number;
  slaOverdue: number;
  draftsCount: number;
}

interface AiExecutiveSummaryProps {
  projectData: ProjectData;
}

export const AiExecutiveSummary: React.FC<AiExecutiveSummaryProps> = ({ projectData }) => {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dashboard-summary', {
        body: { projectData },
      });

      if (error) {
        const msg = (error as any)?.message || 'Erro ao gerar resumo';
        toast.error(msg);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setNarrative(data.narrative);
      toast.success('Resumo executivo gerado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao conectar com a IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!narrative) return;
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-to-JSX renderer for bold and line breaks
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      return (
        <React.Fragment key={i}>
          {line.trim() === '' ? <br /> : <p className="mb-1.5">{parts}</p>}
        </React.Fragment>
      );
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Resumo Executivo IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {narrative && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
            <Button
              size="sm"
              onClick={generate}
              disabled={isLoading}
              variant={narrative ? 'outline' : 'default'}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Gerando...
                </>
              ) : narrative ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Regenerar
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Gerar Resumo
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : narrative ? (
          <div className="text-sm text-foreground leading-relaxed prose-sm max-w-none">
            {renderMarkdown(narrative)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Clique em "Gerar Resumo" para criar uma análise executiva automática do projeto com IA.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
