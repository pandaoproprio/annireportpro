import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity } from '@/types';
import { FileText, Calendar, UserCircle, Link2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  linkedIds: Set<string>;
  onLink: (activityIds: string[]) => Promise<void>;
}

export const DiaryReportLinkDialog: React.FC<Props> = ({
  open, onOpenChange, activities, linkedIds, onLink
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterAuthor, setFilterAuthor] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach(a => {
      if (a.authorName) {
        const key = a.authorEmail || a.authorName;
        if (!map.has(key)) map.set(key, a.authorName);
      }
    });
    return Array.from(map.entries()).map(([key, name]) => ({ key, name }));
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (a.isDraft) return false;
      if (filterAuthor !== 'all' && (a.authorEmail || a.authorName) !== filterAuthor) return false;
      if (filterDateStart && a.date < filterDateStart) return false;
      if (filterDateEnd && a.date > filterDateEnd) return false;
      return true;
    });
  }, [activities, filterAuthor, filterDateStart, filterDateEnd]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    const ids = filtered.filter(a => !linkedIds.has(a.id)).map(a => a.id);
    setSelected(new Set(ids));
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    setIsLinking(true);
    try {
      await onLink(Array.from(selected));
      setSelected(new Set());
      onOpenChange(false);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Vincular Registros do Diário ao Relatório
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 mb-4">
          {authors.length > 1 && (
            <Select value={filterAuthor} onValueChange={setFilterAuthor}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Autor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Autores</SelectItem>
                {authors.map(a => <SelectItem key={a.key} value={a.key}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Input type="date" className="w-40" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
          <Input type="date" className="w-40" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
          <Button variant="outline" size="sm" onClick={selectAll}>Selecionar Todos</Button>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum registro finalizado encontrado.</p>
          ) : (
            filtered.map(a => {
              const alreadyLinked = linkedIds.has(a.id);
              return (
                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${alreadyLinked ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'}`}>
                  <Checkbox
                    checked={alreadyLinked || selected.has(a.id)}
                    disabled={alreadyLinked}
                    onCheckedChange={() => toggle(a.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.date).toLocaleDateString('pt-BR')}
                      </span>
                      {a.authorName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserCircle className="w-3 h-3" />
                          {a.authorName}
                        </span>
                      )}
                      {alreadyLinked && (
                        <Badge variant="secondary" className="text-[10px]">Já vinculado</Badge>
                      )}
                      {a.photos && a.photos.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{a.photos.length} mídia(s)</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-1 line-clamp-2">{a.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleLink} disabled={selected.size === 0 || isLinking}>
            <Link2 className="w-4 h-4 mr-2" />
            Vincular {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
