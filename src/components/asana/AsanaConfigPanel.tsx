import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAsanaConfig, useAsanaActions } from '@/hooks/useAsana';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAppData } from '@/contexts/AppDataContext';

export const AsanaConfigPanel: React.FC = () => {
  const { user } = useAuth();
  const { config, isLoading, saveConfig } = useAsanaConfig();
  const { testConnection, listWorkspaces, listProjects, importTasks } = useAsanaActions();
  const { activeProject } = useAppData();

  const [workspaceGid, setWorkspaceGid] = useState('');
  const [projectGid, setProjectGid] = useState('');
  const [enableCreate, setEnableCreate] = useState(false);
  const [enableSync, setEnableSync] = useState(false);
  const [enableNotify, setEnableNotify] = useState(false);
  const [enableImport, setEnableImport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  const [workspaces, setWorkspaces] = useState<{ gid: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ gid: string; name: string }[]>([]);
  const [loadingWs, setLoadingWs] = useState(false);
  const [loadingPj, setLoadingPj] = useState(false);

  useEffect(() => {
    if (config) {
      setWorkspaceGid(config.workspace_gid || '');
      setProjectGid(config.project_gid || '');
      setEnableCreate(config.enable_create_tasks);
      setEnableSync(config.enable_sync_status);
      setEnableNotify(config.enable_notifications);
      setEnableImport(config.enable_import_tasks);
    }
  }, [config]);

  const handleTest = async () => {
    try {
      await testConnection.mutateAsync();
      setConnectionOk(true);
    } catch {
      setConnectionOk(false);
    }
  };

  const handleLoadWorkspaces = async () => {
    setLoadingWs(true);
    try {
      const ws = await listWorkspaces();
      setWorkspaces(ws);
      if (ws.length === 0) toast.info('Nenhum workspace encontrado');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingWs(false);
    }
  };

  const handleWorkspaceChange = async (gid: string) => {
    setWorkspaceGid(gid);
    setProjectGid('');
    setLoadingPj(true);
    try {
      const pj = await listProjects(gid);
      setProjects(pj);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingPj(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await saveConfig({
        workspace_gid: workspaceGid,
        project_gid: projectGid,
        enable_create_tasks: enableCreate,
        enable_sync_status: enableSync,
        enable_notifications: enableNotify,
        enable_import_tasks: enableImport,
        created_by: user.id,
      });
      toast.success('Configuração do Asana salva!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async () => {
    if (!activeProject?.id) {
      toast.error('Selecione um projeto no sistema primeiro');
      return;
    }
    importTasks.mutate({
      system_project_id: activeProject.id,
      project_gid: projectGid || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando configuração Asana...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-[hsl(var(--primary))]">
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-full">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="6" r="4" />
              <circle cx="5" cy="18" r="4" />
              <circle cx="19" cy="18" r="4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Integração com Asana</h3>
            <p className="text-sm text-muted-foreground">Gerencie a conexão e funcionalidades do Asana</p>
          </div>
        </div>

        {/* Connection test */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testConnection.isPending}>
            {testConnection.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Testar Conexão
          </Button>
          {connectionOk === true && <CheckCircle className="w-5 h-5 text-primary" />}
          {connectionOk === false && <XCircle className="w-5 h-5 text-destructive" />}
        </div>

        {/* Workspace & Project selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Workspace do Asana</Label>
            <div className="flex gap-2">
              {workspaces.length > 0 ? (
                <Select value={workspaceGid} onValueChange={handleWorkspaceChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map(w => (
                      <SelectItem key={w.gid} value={w.gid}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={workspaceGid}
                  onChange={e => setWorkspaceGid(e.target.value)}
                  placeholder="GID do workspace"
                  className="flex-1"
                />
              )}
              <Button variant="outline" size="icon" onClick={handleLoadWorkspaces} disabled={loadingWs}>
                {loadingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Projeto do Asana</Label>
            {projects.length > 0 ? (
              <Select value={projectGid} onValueChange={setProjectGid}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.gid} value={p.gid}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={projectGid}
                onChange={e => setProjectGid(e.target.value)}
                placeholder="GID do projeto"
              />
            )}
          </div>
        </div>

        {/* Feature toggles */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-foreground">Funcionalidades</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Criar tarefas no Asana</p>
              <p className="text-xs text-muted-foreground">Ao publicar relatórios, cria uma tarefa automaticamente</p>
            </div>
            <Switch checked={enableCreate} onCheckedChange={setEnableCreate} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Sincronizar status</p>
              <p className="text-xs text-muted-foreground">Atualiza tarefas no Asana quando status do SLA mudar</p>
            </div>
            <Switch checked={enableSync} onCheckedChange={setEnableSync} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notificações</p>
              <p className="text-xs text-muted-foreground">Envia alertas WIP e SLA como comentários/tarefas</p>
            </div>
            <Switch checked={enableNotify} onCheckedChange={setEnableNotify} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Importar tarefas</p>
              <p className="text-xs text-muted-foreground">Traz tarefas do Asana como atividades no diário</p>
            </div>
            <Switch checked={enableImport} onCheckedChange={setEnableImport} />
          </div>
        </div>

        {/* Import button */}
        {enableImport && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={importTasks.isPending || !activeProject}
            >
              {importTasks.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Importar Tarefas Agora
            </Button>
            <span className="text-xs text-muted-foreground">
              Importa até 50 tarefas para o projeto atual
            </span>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
