import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutomationAlerts, type AutomationAlert, type AutomationRun } from '@/hooks/useAutomationAlerts';
import { Bot, Bell, History, Play, CheckCheck, AlertTriangle, XCircle, Clock, Zap, FileText, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ALERT_TYPE_LABELS: Record<string, string> = {
  sla_overdue: 'SLA Vencido',
  stale_draft: 'Rascunho Estagnado',
  project_inactivity: 'Projeto Inativo',
  workflow_stuck: 'Workflow Parado',
};

const ALERT_TYPE_ICONS: Record<string, React.ReactNode> = {
  sla_overdue: <Clock className="w-4 h-4" />,
  stale_draft: <FileText className="w-4 h-4" />,
  project_inactivity: <Activity className="w-4 h-4" />,
  workflow_stuck: <Zap className="w-4 h-4" />,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
};

function AlertCard({ alert, onMarkRead }: { alert: AutomationAlert; onMarkRead: (id: string) => void }) {
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR });

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
        !alert.is_read ? SEVERITY_STYLES[alert.severity] || 'bg-muted/50 border-border' : 'bg-card border-border opacity-60'
      }`}
      onClick={() => !alert.is_read && onMarkRead(alert.id)}
    >
      <div className="shrink-0 mt-0.5">
        {alert.severity === 'critical' ? (
          <XCircle className="w-5 h-5 text-destructive" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-warning" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {ALERT_TYPE_ICONS[alert.alert_type]}
            <span className="ml-1">{ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm font-medium">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
      </div>
    </div>
  );
}

function RunCard({ run }: { run: AutomationRun }) {
  const timeAgo = formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: ptBR });
  const duration = run.finished_at
    ? `${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
    : 'em execução';

  const statusStyles: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    completed_with_errors: 'bg-warning/10 text-warning border-warning/30',
    failed: 'bg-destructive/10 text-destructive border-destructive/30',
    running: 'bg-primary/10 text-primary border-primary/30',
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
      <div className="shrink-0 mt-0.5">
        <Zap className={`w-5 h-5 ${run.status === 'completed' ? 'text-emerald-500' : run.status === 'failed' ? 'text-destructive' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={`text-xs ${statusStyles[run.status] || ''}`}>
            {run.status === 'completed' ? 'Concluído' :
             run.status === 'completed_with_errors' ? 'Com Erros' :
             run.status === 'failed' ? 'Falhou' : 'Executando'}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          <span className="text-xs text-muted-foreground">({duration})</span>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>🔔 {run.alerts_generated} alertas</span>
          <span>📧 {run.emails_sent} emails</span>
          {run.errors && run.errors.length > 0 && (
            <span className="text-destructive">❌ {run.errors.length} erros</span>
          )}
        </div>
        {run.metadata && (
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            {run.metadata.sla_overdue > 0 && <span>SLA: {run.metadata.sla_overdue}</span>}
            {run.metadata.stale_drafts > 0 && <span>Rascunhos: {run.metadata.stale_drafts}</span>}
            {run.metadata.inactive_projects > 0 && <span>Inativos: {run.metadata.inactive_projects}</span>}
            {run.metadata.deduplicated > 0 && <span>Dedup: {run.metadata.deduplicated}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutomatoDashboard() {
  const { alerts, runs, unreadCount, markAsRead, markAllAsRead, triggerManualRun } = useAutomationAlerts();
  const [tab, setTab] = useState('alerts');

  const handleTrigger = async () => {
    toast.loading('Executando monitoramento...', { id: 'automato-trigger' });
    try {
      const result = await triggerManualRun.mutateAsync();
      toast.success(`Monitoramento concluído: ${result.new_alerts} novos alertas`, { id: 'automato-trigger' });
    } catch (e) {
      toast.error('Falha ao executar monitoramento', { id: 'automato-trigger' });
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_read).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.is_read).length;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Automato</h1>
            <p className="text-sm text-muted-foreground">Monitoramento autônomo do sistema</p>
          </div>
        </div>
        <Button onClick={handleTrigger} disabled={triggerManualRun.isPending} size="sm">
          <Play className="w-4 h-4 mr-1.5" />
          Executar Agora
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-destructive/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-warning">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-primary">{runs.length}</p>
            <p className="text-xs text-muted-foreground">Execuções</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="alerts" className="gap-1.5">
              <Bell className="w-4 h-4" />
              Alertas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          {tab === 'alerts' && unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Marcar tudo como lido
            </Button>
          )}
        </div>

        <TabsContent value="alerts">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum alerta registrado.</p>
                    <p className="text-xs text-muted-foreground mt-1">O sistema monitora automaticamente a cada hora.</p>
                  </CardContent>
                </Card>
              ) : (
                alerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onMarkRead={(id) => markAsRead.mutate(id)} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {runs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma execução registrada.</p>
                  </CardContent>
                </Card>
              ) : (
                runs.map(run => <RunCard key={run.id} run={run} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
