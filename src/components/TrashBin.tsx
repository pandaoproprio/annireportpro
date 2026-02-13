import React from 'react';
import { useTrash, TrashedItem } from '@/hooks/useTrash';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, Loader2, FolderOpen, FileEdit, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  project: { label: 'Projeto', icon: <FolderOpen className="w-3 h-3" /> },
  activity: { label: 'Atividade', icon: <FileEdit className="w-3 h-3" /> },
  team_report: { label: 'Relatório', icon: <Users className="w-3 h-3" /> },
};

export const TrashBin: React.FC = () => {
  const { items, isLoading, restore, isRestoring } = useTrash();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-destructive/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="bg-destructive/10 p-3 rounded-full">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">Lixeira</CardTitle>
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? 'Nenhum item excluído.'
                : `${items.length} ite${items.length === 1 ? 'm' : 'ns'} na lixeira`}
            </p>
          </div>
        </div>
      </CardHeader>

      {items.length > 0 && (
        <CardContent className="pt-0">
          <div className="divide-y divide-border rounded-lg border">
            {items.map((item) => (
              <TrashItem key={`${item.type}-${item.id}`} item={item} onRestore={restore} isRestoring={isRestoring} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const TrashItem: React.FC<{
  item: TrashedItem;
  onRestore: (item: TrashedItem) => Promise<TrashedItem>;
  isRestoring: boolean;
}> = ({ item, onRestore, isRestoring }) => {
  const typeInfo = typeLabels[item.type] || { label: item.type, icon: null };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Badge variant="outline" className="gap-1 shrink-0 text-xs">
          {typeInfo.icon}
          {typeInfo.label}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            Excluído em {format(new Date(item.deletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {item.meta && ` • ${item.meta}`}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={() => onRestore(item)}
        disabled={isRestoring}
      >
        {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        Restaurar
      </Button>
    </div>
  );
};
