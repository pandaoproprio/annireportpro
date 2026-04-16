import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X } from 'lucide-react';
import { useAsanaActions } from '@/hooks/useAsana';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AsanaProject {
  gid: string;
  name: string;
}

interface Props {
  workspaceGid: string;
  syncedGids: Set<string>;
  onAdd: (project: { asana_project_gid: string; asana_project_name: string; workspace_gid: string }) => void;
  isAdding: boolean;
}

export const AsanaBoardSelector: React.FC<Props> = ({ workspaceGid, syncedGids, onAdd, isAdding }) => {
  const { listProjects } = useAsanaActions();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<AsanaProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && workspaceGid) {
      setLoading(true);
      try {
        const pj = await listProjects(workspaceGid);
        setProjects(pj.filter(p => !syncedGids.has(p.gid)));
        setSelected(new Set());
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleProject = (gid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  };

  const handleAddSelected = () => {
    for (const gid of selected) {
      const proj = projects.find(p => p.gid === gid);
      if (proj) {
        onAdd({
          asana_project_gid: proj.gid,
          asana_project_name: proj.name,
          workspace_gid: workspaceGid,
        });
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!workspaceGid}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Boards
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Boards do Asana</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando projetos...
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum projeto disponível para adicionar.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {projects.map(p => (
              <label key={p.gid} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={selected.has(p.gid)}
                  onCheckedChange={() => toggleProject(p.gid)}
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleAddSelected} disabled={selected.size === 0 || isAdding}>
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Adicionar ({selected.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
