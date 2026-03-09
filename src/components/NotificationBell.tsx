import React, { useState } from 'react';
import { Bell, Check, CheckCheck, ClipboardList, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFormNotifications, type FormNotification } from '@/hooks/useFormNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationItem: React.FC<{
  notification: FormNotification;
  onMarkRead: (id: string) => void;
}> = ({ notification, onMarkRead }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

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
        <p className="text-xs text-primary font-medium mt-0.5 truncate">
          {notification.form_title}
        </p>
        {notification.respondent_name && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3" /> {notification.respondent_name}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </div>
  );
};

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useFormNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markAsRead.mutate(id)}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
