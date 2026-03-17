import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CollaboratorPresence {
  userId: string;
  userName: string;
  userEmail: string;
  activeField?: string;
  lastSeen: string;
  color: string;
}

const PRESENCE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

interface UseRealtimeCollaborationOptions {
  /** Unique channel key, e.g. `report_object:{projectId}` */
  channelKey: string;
  /** Called when a remote user broadcasts new data */
  onRemoteUpdate?: (payload: any) => void;
  /** Whether the hook is active */
  enabled?: boolean;
}

export const useRealtimeCollaboration = ({
  channelKey,
  onRemoteUpdate,
  enabled = true,
}: UseRealtimeCollaborationOptions) => {
  const { user, profile } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [remoteUpdateCount, setRemoteUpdateCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  useEffect(() => {
    if (!enabled || !user?.id || !channelKey) return;

    const channel = supabase.channel(`collab:${channelKey}`, {
      config: { presence: { key: user.id } },
    });

    // Track presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        userId: string;
        userName: string;
        userEmail: string;
        activeField?: string;
        color: string;
      }>();

      const others: CollaboratorPresence[] = [];
      for (const [key, presences] of Object.entries(state)) {
        if (key === user.id) continue;
        const p = presences[0];
        if (p) {
          others.push({
            userId: p.userId,
            userName: p.userName,
            userEmail: p.userEmail,
            activeField: p.activeField,
            lastSeen: new Date().toISOString(),
            color: p.color,
          });
        }
      }
      setCollaborators(others);
    });

    // Listen for data broadcasts from other users
    channel.on('broadcast', { event: 'report_update' }, ({ payload }) => {
      if (payload?.senderId === user.id) return;
      setRemoteUpdateCount(c => c + 1);
      onRemoteUpdateRef.current?.(payload?.data);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: user.id,
          userName: profile?.name || user.email?.split('@')[0] || 'Anônimo',
          userEmail: user.email || '',
          color: getColorForUser(user.id),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [enabled, user?.id, user?.email, profile?.name, channelKey]);

  /** Broadcast updated report data to other editors */
  const broadcastUpdate = useCallback((data: any) => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'report_update',
      payload: { senderId: user.id, data, timestamp: new Date().toISOString() },
    });
  }, [user?.id]);

  /** Update which field the current user is editing */
  const trackActiveField = useCallback((fieldName?: string) => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.track({
      userId: user.id,
      userName: profile?.name || user.email?.split('@')[0] || 'Anônimo',
      userEmail: user.email || '',
      activeField: fieldName,
      color: getColorForUser(user.id),
    });
  }, [user?.id, user?.email, profile?.name]);

  return {
    collaborators,
    broadcastUpdate,
    trackActiveField,
    remoteUpdateCount,
    isCollaborating: collaborators.length > 0,
  };
};
