import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAsanaConfig, useAsanaActions, useSyncedProjects } from '@/hooks/useAsana';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppData } from '@/contexts/AppDataContext';
import { AsanaBoardSelector } from './AsanaBoardSelector';
import { AsanaSyncLogsTable } from './AsanaSyncLogsTable';

export const AsanaConfigPanel: React.FC = () => {
  const { user } = useAuth();
  const { config, isLoading, saveConfig, toggleGlobal } = useAsanaConfig();
  const { testConnection, listWorkspaces, listProjects, importTasks, backfillTeamReports } = useAsanaActions();
  const { syncedProjects, isLoading: loadingSynced, addProject, removeProject, forceSync } = useSyncedProjects();
  const { activeProject } = useAppData();

  const [workspaceGid, setWorkspaceGid] = useState('');
  const [projectGid, setProjectGid] = useState('');
  const [enableCreate, setEnableCreate] = useState(false);
  const [enableSync, setEnableSync] = useState(false);
  const [enableNotify, setEnableNotify] = useState(false);
  const [enableImport, setEnableImport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  const [workspaces, setWorkspaces] = useState<{ gid: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ gid: string; name: string }[]>([]);
  const [loadingWs, setLoadingWs] = useState(false);
  const [loadingPj, setLoadingPj] = useState(false);

  const [logFilter, setLogFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (config) {
      setWorkspaceGid(config.workspace_gid || '');
      setProjectGid(config.project_gid || '');
      setEnableCreate(config.enable_create_tasks);
      setEnableSync(config.enable_sync_status);
      setEnableNotify(config.enable_notifications);
      setEnableImport(config.enable_import_tasks);
      setGlobalEnabled(config.is_globally_enabled !== false);
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
    importTasks.mutate({ system_project_id: activeProject.id, project_gid: projectGid || undefined });
  };

  const handleToggleGlobal = (enabled: boolean) => {
    setGlobalEnabled(enabled);
    toggleGlobal.mutate(enabled);
  };

  const syncedGids = new Set(syncedProjects.map(sp => sp.asana_project_gid));

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="text-xs bg-primary/20 text-primary border-primary/30">✅ Ativo</Badge>;
      case 'paused': return <Badge variant="secondary" className="text-xs">⏸ Pausado</Badge>;
      case 'error': return <Badge variant="destructive" className="text-xs">❌ Erro</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
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
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-l-4 border-l-[hsl(var(--primary))]">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-full">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="6" r="4" />
                  <circle cx="5" cy="18" r="4" />
                  <circle cx="19" cy="18" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Integração Bidirecional com Asana</h3>
                <p className="text-sm text-muted-foreground">Sincronização automática entre Asana e GIRA Relatórios</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Integração Global</span>
              <Switch checked={globalEnabled} onCheckedChange={handleToggleGlobal} />
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
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o workspace" /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(w => <SelectItem key={w.gid} value={w.gid}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={workspaceGid} onChange={e => setWorkspaceGid(e.target.value)} placeholder="GID do workspace" className="flex-1" />
                )}
                <Button variant="outline" size="icon" onClick={handleLoadWorkspaces} disabled={loadingWs}>
                  {loadingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Projeto Padrão do Asana</Label>
              {projects.length > 0 ? (
                <Select value={projectGid} onValueChange={setProjectGid}>
                  <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.gid} value={p.gid}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={projectGid} onChange={e => setProjectGid(e.target.value)} placeholder="GID do projeto" />
              )}
            </div>
          </div>

          {/* Feature toggles */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-foreground">Funcionalidades</h4>
            {[
              { label: 'Criar tarefas no Asana', desc: 'Ao publicar relatórios, cria uma tarefa automaticamente', checked: enableCreate, set: setEnableCreate },
              { label: 'Sincronizar status', desc: 'Atualiza tarefas no Asana quando status do SLA mudar', checked: enableSync, set: setEnableSync },
              { label: 'Notificações', desc: 'Envia alertas WIP e SLA como comentários/tarefas', checked: enableNotify, set: setEnableNotify },
              { label: 'Importar tarefas', desc: 'Traz tarefas do Asana como atividades no diário', checked: enableImport, set: setEnableImport },
            ].map(t => (
              <div key={t.label} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <Switch checked={t.checked} onCheckedChange={t.set} />
              </div>
            ))}
          </div>

          {/* Import / Backfill */}
          <div className="flex flex-wrap gap-3">
            {enableImport && (
              <Button variant="outline" onClick={handleImport} disabled={importTasks.isPending || !activeProject}>
                {importTasks.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Importar Tarefas
              </Button>
            )}
            {enableCreate && (
              <Button variant="outline" onClick={() => backfillTeamReports.mutate()} disabled={backfillTeamReports.isPending}>
                {backfillTeamReports.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Sincronizar Relatórios Existentes
              </Button>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Synced Boards Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-foreground">Boards Sincronizados</h4>
            <AsanaBoardSelector
              workspaceGid={workspaceGid}
              syncedGids={syncedGids}
              onAdd={(p) => addProject.mutate(p)}
              isAdding={addProject.isPending}
            />
          </div>

          {loadingSynced ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando boards...
            </div>
          ) : syncedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum board selecionado para sincronização. Use o botão acima para adicionar.</p>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Board</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Sync</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncedProjects.map(sp => (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium">{sp.asana_project_name || sp.asana_project_gid}</TableCell>
                      <TableCell>{statusBadge(sp.sync_status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sp.last_synced_at ? new Date(sp.last_synced_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-48 truncate">{sp.last_error || '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => forceSync.mutate(sp.id)}
                          disabled={forceSync.isPending}
                        >
                          {forceSync.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          <span className="ml-1 hidden sm:inline">Sincronizar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProject.mutate(sp.id)}
                          disabled={removeProject.isPending}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Logs Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="text-lg font-semibold text-foreground">Log de Sincronização</h4>
          <AsanaSyncLogsTable
            syncedProjectId={logFilter}
            onFilterChange={setLogFilter}
            boardOptions={syncedProjects.map(sp => ({ id: sp.id, name: sp.asana_project_name || sp.asana_project_gid }))}
          />
        </CardContent>
      </Card>
    </div>
  );
};
