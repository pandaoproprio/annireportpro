import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ChatChannel {
  id: string;
  project_id: string | null;
  created_by: string;
  channel_type: 'project' | 'group' | 'direct';
  name: string;
  description: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string;
  // joined
  user_name?: string;
  user_email?: string;
}

export function useChatChannels() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ['chat-channels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_channels' as any)
        .select('*')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ChatChannel[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const createChannel = useMutation({
    mutationFn: async (channel: {
      name: string;
      description?: string;
      channel_type: string;
      project_id?: string | null;
      member_ids?: string[];
    }) => {
      const { member_ids, ...channelData } = channel;
      const { data, error } = await supabase
        .from('chat_channels' as any)
        .insert({
          ...channelData,
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      
      const channelId = (data as any).id;

      // Add creator as admin member
      await supabase.from('chat_channel_members' as any).insert({
        channel_id: channelId,
        user_id: user!.id,
        role: 'admin',
      } as any);

      // Add other members
      if (member_ids?.length) {
        const members = member_ids
          .filter(id => id !== user!.id)
          .map(id => ({
            channel_id: channelId,
            user_id: id,
            role: 'member',
          }));
        if (members.length) {
          await supabase.from('chat_channel_members' as any).insert(members as any);
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] });
      toast.success('Canal criado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar canal: ${err.message}`);
    },
  });

  const getChannelMembers = async (channelId: string): Promise<ChatChannelMember[]> => {
    const { data, error } = await supabase
      .from('chat_channel_members' as any)
      .select('*')
      .eq('channel_id', channelId);
    if (error) throw error;
    return (data || []) as unknown as ChatChannelMember[];
  };

  const addMember = useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { error } = await supabase
        .from('chat_channel_members' as any)
        .insert({ channel_id: channelId, user_id: userId, role: 'member' } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channel-members'] });
      toast.success('Membro adicionado!');
    },
  });

  const updateLastRead = async (channelId: string) => {
    if (!user) return;
    await supabase
      .from('chat_channel_members' as any)
      .update({ last_read_at: new Date().toISOString() } as any)
      .eq('channel_id', channelId)
      .eq('user_id', user.id);
  };

  return {
    channels: channelsQuery.data || [],
    isLoading: channelsQuery.isLoading,
    createChannel,
    getChannelMembers,
    addMember,
    updateLastRead,
    refetch: channelsQuery.refetch,
  };
}
