import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity, Database, Shield, Users, Clock, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Loader2, Server, Bug, FileText
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HealthCheck {
  status: string;
  timestamp: string;
  total_latency_ms: number;
  checks: Record<string, { status: string; latency_ms?: number; error?: string }>;
}

export default function ObservabilityDashboard() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Health check
  const { data: health, refetch: refetchHealth, isLoading: loadingHealth } = useQuery({
    queryKey: ['health-check'],
    queryFn: async () => {
      const resp = await supabase.functions.invoke('health-check');
      if (resp.error) throw resp.error;
      return resp.data as HealthCheck;
    },
    staleTime: 30_000,
    enabled: !!user,
  });

  // Recent errors from audit_logs
  const { data: recentErrors = [] } = useQuery({
    queryKey: ['recent-client-errors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'client_error')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // LGPD requests
  const { data: lgpdRequests = [] } = useQuery({
    queryKey: ['lgpd-requests-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lgpd_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // System stats
  const { data: stats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const [activities, projects, users, workflows] = await Promise.all([
        supabase.from('activities').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('report_workflows').select('*', { count: 'exact', head: true }),
      ]);
      return {
        activities: activities.count || 0,
        projects: projects.count || 0,
        users: users.count || 0,
        workflows: workflows.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  // Recent audit logs
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recent-audit-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .neq('action', 'client_error')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchHealth();
    setIsRefreshing(false);
  };

  const statusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'degraded') return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const statusColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (status === 'degraded') return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Observabilidade do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de saúde, erros e métricas em tempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Status dos Serviços
            {health && (
              <Badge variant="outline" className={statusColor(health.status)}>
                {health.status === 'healthy' ? 'Operacional' : health.status === 'degraded' ? 'Degradado' : 'Indisponível'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHealth ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(health.checks).map(([name, check]) => (
                <div key={name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{name === 'database' ? 'Banco de Dados' : name === 'auth' ? 'Autenticação' : 'Armazenamento'}</p>
                    <p className="text-xs text-muted-foreground">
                      {check.latency_ms ? `${check.latency_ms}ms` : '—'}
                      {check.error && ` · ${check.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Não foi possível verificar o status.</p>
          )}
          {health && (
            <p className="text-xs text-muted-foreground mt-3">
              Última verificação: {format(new Date(health.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })} · Latência total: {health.total_latency_ms}ms
            </p>
          )}
        </CardContent>
      </Card>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Usuários', value: stats?.users || 0, color: 'text-primary' },
          { icon: Database, label: 'Projetos', value: stats?.projects || 0, color: 'text-primary' },
          { icon: FileText, label: 'Atividades', value: stats?.activities || 0, color: 'text-primary' },
          { icon: Activity, label: 'Workflows', value: stats?.workflows || 0, color: 'text-primary' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="py-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Errors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="w-5 h-5 text-destructive" />
              Erros do Cliente
              {recentErrors.length > 0 && (
                <Badge variant="destructive" className="text-xs">{recentErrors.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {recentErrors.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-green-500" />
                  <p className="text-sm">Nenhum erro recente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentErrors.map((err: any) => {
                    const meta = err.metadata as any;
                    return (
                      <div key={err.id} className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-destructive font-medium truncate flex-1">
                            {err.entity_name || 'Unknown'}
                          </p>
                          <span className="text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(err.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        {meta?.url && (
                          <p className="text-muted-foreground mt-1 truncate">{meta.url}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* LGPD Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Solicitações LGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {lgpdRequests.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhuma solicitação LGPD</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lgpdRequests.map((req: any) => (
                    <div key={req.id} className="p-2.5 rounded-lg bg-muted/50 text-xs flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="text-[10px]">
                          {req.request_type === 'export' ? '📤 Exportação' : '🗑️ Exclusão'}
                        </Badge>
                        <span className="ml-2 text-muted-foreground">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <Badge variant={req.status === 'completed' ? 'default' : req.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {req.status === 'completed' ? 'Concluído' : req.status === 'failed' ? 'Falhou' : req.status === 'processing' ? 'Processando' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Log de Auditoria Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1.5">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground ml-2">{log.entity_type}: {log.entity_name || log.entity_id?.substring(0, 8)}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
