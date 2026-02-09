import React, { useState } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface BatchDeleteProjectsProps {
  onClose: () => void;
}

export const BatchDeleteProjects: React.FC<BatchDeleteProjectsProps> = ({ onClose }) => {
  const { projects, removeMultipleProjects } = useAppData();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleProject = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map(p => p.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Tem certeza que deseja excluir ${count} projeto(s)? Esta ação não pode ser desfeita.`)) return;

    setIsDeleting(true);
    try {
      await removeMultipleProjects(Array.from(selectedIds));
      toast.success(`${count} projeto(s) excluído(s) com sucesso!`);
      setSelectedIds(new Set());
      onClose();
    } catch {
      toast.error('Erro ao excluir projetos.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Exclusão em Lote</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-3 pb-3 border-b">
          <Checkbox
            checked={projects.length > 0 && selectedIds.size === projects.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium text-muted-foreground">
            Selecionar todos ({selectedIds.size}/{projects.length})
          </span>
        </div>

        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {projects.map(project => (
            <li
              key={project.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
              onClick={() => toggleProject(project.id)}
            >
              <Checkbox
                checked={selectedIds.has(project.id)}
                onCheckedChange={() => toggleProject(project.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{project.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {project.fomentoNumber} • {project.funder || 'Sem financiador'}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || isDeleting}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Excluir {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
