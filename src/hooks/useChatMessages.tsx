import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  // joined
  author_name?: string;
}

export function useChatMessages(channelId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
    enabled: !!channelId && !!user,
    staleTime: 10_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as ChatMessage;
          setRealtimeMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // Reset realtime messages when query data changes
  useEffect(() => {
    setRealtimeMessages([]);
  }, [messagesQuery.data]);

  const allMessages = [
    ...(messagesQuery.data || []),
    ...realtimeMessages.filter(
      rm => !(messagesQuery.data || []).some(m => m.id === rm.id)
    ),
  ];

  const sendMessage = useMutation({
    mutationFn: async (msg: {
      content: string;
      file_url?: string;
      file_name?: string;
      file_type?: string;
    }) => {
      if (!channelId || !user) throw new Error('Missing channel or user');
      const { error } = await supabase
        .from('chat_messages' as any)
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: msg.content,
          file_url: msg.file_url || null,
          file_name: msg.file_name || null,
          file_type: msg.file_type || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      // Update channel's updated_at
      if (channelId) {
        supabase
          .from('chat_channels' as any)
          .update({ updated_at: new Date().toISOString() } as any)
          .eq('id', channelId)
          .then(() => {
            qc.invalidateQueries({ queryKey: ['chat-channels'] });
          });
      }
    },
  });

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    const fileId = crypto.randomUUID();
    const ext = file.name.split('.').pop() || 'bin';
    const path = `chat/${channelId}/${fileId}.${ext}`;

    const { error } = await supabase.storage
      .from('team-report-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) return null;

    const { data: urlData } = supabase.storage
      .from('team-report-photos')
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
    };
  }, [channelId]);

  return {
    messages: allMessages,
    isLoading: messagesQuery.isLoading,
    sendMessage,
    uploadFile,
  };
}
