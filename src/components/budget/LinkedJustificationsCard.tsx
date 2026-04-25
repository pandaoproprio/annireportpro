import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, ExternalLink, FileSignature } from 'lucide-react';
import { format } from 'date-fns';
import { TYPE_LABELS, STATUS_LABELS } from '@/hooks/useLegalJustifications';

interface Props {
  adjustmentId: string;
  projectId: string;
}

interface JustRow {
  id: string;
  type: keyof typeof TYPE_LABELS;
  status: keyof typeof STATUS_LABELS;
  document_title: string;
  is_sealed: boolean;
  created_at: string;
}

export const LinkedJustificationsCard: React.FC<Props> = ({ adjustmentId, projectId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<JustRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('legal_justifications' as any)
        .select('id, type, status, document_title, is_sealed, created_at')
        .eq('budget_adjustment_id', adjustmentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      setItems((data as any) || []);
      setLoading(false);
    };
    load();
  }, [adjustmentId]);

  const goCreate = () => {
    navigate(`/justificativas?project=${projectId}&adjustment=${adjustmentId}&type=ajuste_pt&new=1`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            Justificativas Jurídicas Vinculadas
          </CardTitle>
          <Button size="sm" variant="default" onClick={goCreate} className="gap-1">
            <FileSignature className="w-3 h-3" />
            Gerar Justificativa
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Documentos formais (Lei 13.019/2014) gerados a partir deste Ajuste de PT.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma justificativa formal vinculada ainda. Clique em "Gerar Justificativa" para criar a peça jurídica para o concedente.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((j) => {
              const st = STATUS_LABELS[j.status];
              return (
                <div key={j.id} className="flex justify-between items-center border rounded-md p-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{j.document_title || TYPE_LABELS[j.type]}</span>
                      <Badge variant="secondary" className={st?.color}>{st?.label}</Badge>
                      {j.is_sealed && <Badge variant="outline" className="text-[10px]">Lacrado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_LABELS[j.type]} · {format(new Date(j.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 shrink-0"
                    onClick={() => navigate(`/justificativas?open=${j.id}`)}
                  >
                    Abrir <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
