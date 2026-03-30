import { useEffect, useRef, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { SupabaseProvider } from '@/lib/yjs/SupabaseProvider';
import { useAuth } from '@/hooks/useAuth';

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

interface UseYjsCollaborationOptions {
  /** Unique document channel key */
  channelKey: string;
  /** Whether collaboration is enabled */
  enabled?: boolean;
}

export const useYjsCollaboration = ({ channelKey, enabled = true }: UseYjsCollaborationOptions) => {
  const { user, profile } = useAuth();
  const providerRef = useRef<SupabaseProvider | null>(null);
  const [connected, setConnected] = useState(false);

  // Stable Y.Doc instance per channel
  const ydoc = useMemo(() => new Y.Doc(), [channelKey]);

  useEffect(() => {
    if (!enabled || !user?.id || !channelKey) return;

    const provider = new SupabaseProvider({
      channelKey,
      doc: ydoc,
      user: {
        id: user.id,
        name: profile?.name || user.email?.split('@')[0] || 'Anônimo',
        color: getColorForUser(user.id),
      },
    });

    providerRef.current = provider;
    setConnected(true);

    return () => {
      provider.destroy();
      providerRef.current = null;
      setConnected(false);
    };
  }, [enabled, user?.id, user?.email, profile?.name, channelKey, ydoc]);

  return {
    ydoc,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness ?? null,
    connected,
  };
};
