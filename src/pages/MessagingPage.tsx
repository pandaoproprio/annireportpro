import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useChatChannels, ChatChannel } from '@/hooks/useChatChannels';
import { useChatMessages } from '@/hooks/useChatMessages';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquare, Plus, Send, Hash, Users, User, Paperclip,
  Loader2, Image as ImageIcon, FileText, ArrowLeft
} from 'lucide-react';

const MessagingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { projects, activeProjectId } = useAppData();
  const { isAdmin } = usePermissions();
  const { channels, isLoading: channelsLoading, createChannel, updateLastRead } = useChatChannels();

  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<string>('project');
  const [newChannelProjectId, setNewChannelProjectId] = useState(activeProjectId || '');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [messageText, setMessageText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const { messages, isLoading: messagesLoading, sendMessage, uploadFile } = useChatMessages(selectedChannel?.id || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profiles cache for author names
  const [profilesCache, setProfilesCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const userIds = [...new Set(messages.map(m => m.user_id))];
    const missing = userIds.filter(id => !profilesCache[id]);
    if (missing.length === 0) return;

    supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', missing)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p: any) => { map[p.user_id] = p.name; });
          setProfilesCache(prev => ({ ...prev, ...map }));
        }
      });
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when selecting channel
  useEffect(() => {
    if (selectedChannel) {
      updateLastRead(selectedChannel.id);
    }
  }, [selectedChannel]);

  const handleSelectChannel = (ch: ChatChannel) => {
    setSelectedChannel(ch);
    setMobileShowChat(true);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast.error('Nome do canal é obrigatório.');
      return;
    }
    await createChannel.mutateAsync({
      name: newChannelName,
      description: newChannelDesc,
      channel_type: newChannelType,
      project_id: newChannelType === 'project' ? newChannelProjectId : null,
    });
    setShowNewChannel(false);
    setNewChannelName('');
    setNewChannelDesc('');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    await sendMessage.mutateAsync({ content: messageText.trim() });
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        await sendMessage.mutateAsync({
          content: `📎 ${result.name}`,
          file_url: result.url,
          file_name: result.name,
          file_type: result.type,
        });
      }
    } catch {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const channelIcon = (type: string) => {
    if (type === 'direct') return <User className="w-4 h-4" />;
    if (type === 'group') return <Users className="w-4 h-4" />;
    return <Hash className="w-4 h-4" />;
  };

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Mensagens
        </h1>
        <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo Canal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Canal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select value={newChannelType} onValueChange={setNewChannelType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Canal de Projeto</SelectItem>
                    <SelectItem value="group">Grupo de Trabalho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newChannelType === 'project' && (
                <div>
                  <Label>Projeto</Label>
                  <Select value={newChannelProjectId} onValueChange={setNewChannelProjectId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Nome do Canal *</Label>
                <Input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Ex: Equipe Oficineiros" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="Descrição opcional" />
              </div>
              <Button className="w-full" onClick={handleCreateChannel} disabled={createChannel.isPending}>
                {createChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Canal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex border rounded-lg overflow-hidden bg-card min-h-0">
        {/* Channel List */}
        <div className={`w-full md:w-72 border-r flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canais</p>
          </div>
          <ScrollArea className="flex-1">
            {channelsLoading ? (
              <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : channels.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum canal ainda. Crie um para começar!
              </div>
            ) : (
              <div className="py-1">
                {channels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-accent/50 transition-colors ${
                      selectedChannel?.id === ch.id ? 'bg-accent' : ''
                    }`}
                  >
                    {channelIcon(ch.channel_type)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">{ch.name}</p>
                      {ch.description && (
                        <p className="text-xs text-muted-foreground truncate">{ch.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowChat && !selectedChannel ? 'hidden md:flex' : 'flex'}`}>
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                <button
                  className="md:hidden p-1"
                  onClick={() => { setMobileShowChat(false); setSelectedChannel(null); }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {channelIcon(selectedChannel.channel_type)}
                <div>
                  <p className="font-medium text-foreground">{selectedChannel.name}</p>
                  {selectedChannel.description && (
                    <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma mensagem ainda. Envie a primeira!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => {
                      const isOwn = msg.user_id === user?.id;
                      const authorName = profilesCache[msg.user_id] || 'Usuário';
                      const isImage = msg.file_type?.startsWith('image/');

                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                            {!isOwn && (
                              <p className="text-xs font-medium text-primary mb-0.5 ml-1">{authorName}</p>
                            )}
                            <div className={`rounded-lg px-3 py-2 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}>
                              {msg.file_url && isImage && (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.file_url} alt="" className="rounded max-w-[250px] max-h-[200px] mb-1" />
                                </a>
                              )}
                              {msg.file_url && !isImage && (
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm underline mb-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  {msg.file_name || 'Arquivo'}
                                </a>
                              )}
                              {!msg.file_url && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                              {msg.file_url && msg.content && !msg.content.startsWith('📎') && (
                                <p className="text-sm whitespace-pre-wrap mt-1">{msg.content}</p>
                              )}
                            </div>
                            <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                              {format(parseISO(msg.created_at), 'HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-3 border-t bg-background">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileAttach}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </Button>
                  <Textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessage.isPending}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Selecione um canal para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingPage;
