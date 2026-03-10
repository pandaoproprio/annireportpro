import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProactiveSummaryCardProps {
  projectId: string | undefined;
}

export const ProactiveSummaryCard: React.FC<ProactiveSummaryCardProps> = ({ projectId }) => {
  const [summary, setSummary] = useState<{ summary_text: string; generated_at: string; metadata: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    const fetchLatest = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('proactive_summaries' as any)
        .select('summary_text, generated_at, metadata')
        .eq('project_id', projectId)
        .eq('summary_type', 'daily')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSummary(data as any);
      }
      setIsLoading(false);
    };

    fetchLatest();
  }, [projectId]);

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

  if (!projectId) return null;

  return (
    <Card className="hover:shadow-md transition-shadow border-accent/30 bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-accent-foreground" />
            Análise Proativa IA
          </CardTitle>
          {summary && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(summary.generated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : summary ? (
          <div className="space-y-3">
            <div className="text-sm text-foreground leading-relaxed prose-sm max-w-none">
              {renderMarkdown(summary.summary_text)}
            </div>
            {summary.metadata && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Badge variant="secondary" className="text-xs gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {(summary.metadata as any)?.total_activities || 0} atividades
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {(summary.metadata as any)?.total_attendees || 0} impactados
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {(summary.metadata as any)?.days_remaining || '?'} dias restantes
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <BrainCircuit className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma análise proativa disponível ainda.</p>
            <p className="text-xs mt-1">Resumos são gerados automaticamente a cada dia.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
