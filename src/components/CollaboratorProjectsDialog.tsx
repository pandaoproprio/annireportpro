import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, FolderOpen } from 'lucide-react';
import { useCollaboratorManagement, ProjectOption } from '@/hooks/useCollaboratorManagement';
import { AdminUser } from '@/hooks/useAdminUsers';

interface Props {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CollaboratorProjectsDialog: React.FC<Props> = ({ user, open, onOpenChange }) => {
  const { projects, assignments, isLoading, fetchProjects, fetchAssignments, assignProject, removeAssignment } = useCollaboratorManagement();
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchProjects();
      fetchAssignments(user.id);
    }
  }, [open, user, fetchProjects, fetchAssignments]);

  const availableProjects = projects.filter(p => !assignments.some(a => a.project_id === p.id));

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  const getProjectOrg = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.organization_name || '';
  };

  const handleAssign = async () => {
    if (!user || !selectedProject) return;
    const result = await assignProject(user.id, selectedProject);
    if (result.success) setSelectedProject('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Projetos Vinculados
          </DialogTitle>
          <DialogDescription>
            Gerencie os projetos de <strong>{user?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Current assignments */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Projetos atribuídos</p>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum projeto vinculado</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{getProjectName(a.project_id)}</p>
                    <p className="text-xs text-muted-foreground truncate">{getProjectOrg(a.project_id)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => user && removeAssignment(user.id, a.project_id)}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new assignment */}
        {availableProjects.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-foreground">Adicionar projeto</p>
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!selectedProject || isLoading} size="icon">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {availableProjects.length === 0 && projects.length > 0 && assignments.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            Todos os projetos já estão vinculados
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
