import React, { useState } from 'react';
import { Bell, CheckCheck, ClipboardList, User, GitBranch, ArrowRight, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useFormNotifications, type FormNotification } from '@/hooks/useFormNotifications';
import { useWorkflowNotifications, type WorkflowNotification } from '@/hooks/useWorkflowNotifications';
import { useAutomationAlerts, type AutomationAlert } from '@/hooks/useAutomationAlerts';
import { WORKFLOW_STATUS_LABELS } from '@/hooks/useReportWorkflow';
import type { WorkflowStatus } from '@/hooks/useReportWorkflow';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const REPORT_TYPE_LABELS: Record<string, string> = {
  report_object: 'Rel. Objeto',
  report_team: 'Rel. Equipe',
  justification: 'Justificativa',
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-muted text-muted-foreground',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  sla_overdue: 'SLA Atrasado',
  stale_draft: 'Rascunho Parado',
  project_inactivity: 'Projeto Inativo',
  workflow_stuck: 'Workflow Parado',
};

const FormNotificationItem: React.FC<{
  notification: FormNotification;
  onMarkRead: (id: string) => void;
}> = ({ notification, onMarkRead }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR });

  return (
    <div
      className={`flex items-start gap-3 p-3 border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-muted/50 ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className="shrink-0 mt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          !notification.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          <ClipboardList className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!notification.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          Nova resposta no formulário
        </p>
        <p className="text-xs text-primary font-medium mt-0.5 truncate">{notification.form_title}</p>
        {notification.respondent_name && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3" /> {notification.respondent_name}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
    </div>
  );
};

const WorkflowNotificationItem: React.FC<{
  notification: WorkflowNotification;
  onMarkRead: (id: string) => void;
}> = ({ notification, onMarkRead }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR });
  const toLabel = WORKFLOW_STATUS_LABELS[notification.to_status as WorkflowStatus] || notification.to_status;
  const fromLabel = notification.from_status ? (WORKFLOW_STATUS_LABELS[notification.from_status as WorkflowStatus] || notification.from_status) : null;
  const typeLabel = REPORT_TYPE_LABELS[notification.report_type] || notification.report_type;

  return (
    <div
      className={`flex items-start gap-3 p-3 border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-muted/50 ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className="shrink-0 mt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          !notification.is_read ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          <GitBranch className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!notification.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {typeLabel} — status alterado
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-xs">
          {fromLabel && (
            <>
              <span className="text-muted-foreground">{fromLabel}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </>
          )}
          <span className="font-medium text-primary">{toLabel}</span>
        </div>
        {notification.changed_by_name && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3" /> {notification.changed_by_name}
          </p>
        )}
        {notification.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate italic">"{notification.notes}"</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
    </div>
  );
};

const AlertNotificationItem: React.FC<{
  alert: AutomationAlert;
  onMarkRead: (id: string) => void;
}> = ({ alert, onMarkRead }) => {
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR });
  const typeLabel = ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type;
  const severityClass = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;

  return (
    <div
      className={`flex items-start gap-3 p-3 border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-muted/50 ${
        !alert.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={() => !alert.is_read && onMarkRead(alert.id)}
    >
      <div className="shrink-0 mt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${severityClass}`}>
          <AlertTriangle className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!alert.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {alert.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{typeLabel}</Badge>
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
      {!alert.is_read && <div className="w-2 h-2 rounded-full bg-destructive shrink-0 mt-2" />}
    </div>
  );
};

export const NotificationBell: React.FC = () => {
  const forms = useFormNotifications();
  const workflows = useWorkflowNotifications();
  const automation = useAutomationAlerts();
  const [open, setOpen] = useState(false);

  const totalUnread = forms.unreadCount + workflows.unreadCount + automation.unreadCount;

  const handleMarkAllRead = () => {
    if (forms.unreadCount > 0) forms.markAllAsRead.mutate();
    if (workflows.unreadCount > 0) workflows.markAllAsRead.mutate();
    if (automation.unreadCount > 0) automation.markAllAsRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
          {totalUnread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={handleMarkAllRead}>
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
            </Button>
          )}
        </div>

        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2 h-9 gap-0">
            <TabsTrigger value="workflow" className="text-xs gap-1 data-[state=active]:shadow-none px-2">
              <GitBranch className="w-3.5 h-3.5" /> Workflow
              {workflows.unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">{workflows.unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="forms" className="text-xs gap-1 data-[state=active]:shadow-none px-2">
              <ClipboardList className="w-3.5 h-3.5" /> Forms
              {forms.unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">{forms.unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs gap-1 data-[state=active]:shadow-none px-2">
              <Zap className="w-3.5 h-3.5" /> Alertas
              {automation.unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">{automation.unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0">
            <ScrollArea className="max-h-80">
              {workflows.notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma notificação de workflow</p>
                </div>
              ) : (
                workflows.notifications.map(n => (
                  <WorkflowNotificationItem key={n.id} notification={n} onMarkRead={(id) => workflows.markAsRead.mutate(id)} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="forms" className="mt-0">
            <ScrollArea className="max-h-80">
              {forms.notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma notificação de formulário</p>
                </div>
              ) : (
                forms.notifications.map(n => (
                  <FormNotificationItem key={n.id} notification={n} onMarkRead={(id) => forms.markAsRead.mutate(id)} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <ScrollArea className="max-h-80">
              {automation.alerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum alerta de automação</p>
                </div>
              ) : (
                automation.alerts.slice(0, 30).map(a => (
                  <AlertNotificationItem key={a.id} alert={a} onMarkRead={(id) => automation.markAsRead.mutate(id)} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
