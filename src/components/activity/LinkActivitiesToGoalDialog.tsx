import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActivityData } from '@/contexts/ActivityContext';
import { useActivities } from '@/hooks/useActivities';

interface Props {
  projectId: string;
  goalId: string;
  goalTitle: string;
}

interface Row {
  id: string;
  date: string;
  description: string;
  attendees_count: number | null;
  goal_id: string | null;
}

export const LinkActivitiesToGoalDialog: React.FC<Props> = ({ projectId, goalId, goalTitle }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const { linkActivitiesToGoal } = useActivities(projectId);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    supabase
      .from('activities')
      .select('id, date, description, attendees_count, goal_id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Erro ao carregar registros do Diário de Bordo');
          setRows([]);
        } else {
          // Mostrar somente registros que ainda não estão vinculados a esta meta
          setRows((data || []).filter((r: Row) => r.goal_id !== goalId));
        }
        setLoading(false);
      });
  }, [open, projectId, goalId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.description?.toLowerCase().includes(q) ||
      r.date?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const ok = await linkActivitiesToGoal(goalId, Array.from(selected));
    setSaving(false);
    if (ok) {
      toast.success(`${selected.size} registro(s) vinculado(s) à meta`);
      setOpen(false);
    } else {
      toast.error('Não foi possível vincular alguns registros (verifique permissões).');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Link2 className="w-3 h-3" />
          Vincular registros
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vincular registros do Diário de Bordo</DialogTitle>
          <DialogDescription>
            Selecione registros existentes do projeto para associar a <strong>{goalTitle}</strong>.
            Cada registro fica vinculado a uma única meta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por descrição ou data..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={selectAll} disabled={loading || filtered.length === 0}>
            {selected.size === filtered.length && filtered.length > 0 ? 'Desmarcar tudo' : 'Selecionar tudo'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto border rounded">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando registros...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nenhum registro disponível para vincular a esta meta.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(r => {
                const isLinkedElsewhere = !!r.goal_id && r.goal_id !== goalId;
                const date = new Date(r.date).toLocaleDateString('pt-BR');
                return (
                  <li
                    key={r.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 ${selected.has(r.id) ? 'bg-success/10' : ''}`}
                    onClick={() => toggle(r.id)}
                  >
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggle(r.id)}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong>{date}</strong>
                        {r.attendees_count && r.attendees_count > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {r.attendees_count} participante(s)
                          </span>
                        ) : null}
                        {isLinkedElsewhere && (
                          <span className="text-[10px] uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Vinculado a outra meta
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{r.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={selected.size === 0 || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Vincular {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
