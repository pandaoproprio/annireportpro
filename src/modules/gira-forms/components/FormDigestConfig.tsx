import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Mail, Plus, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  formId: string;
}

export function FormDigestConfig({ formId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const configQuery = useQuery({
    queryKey: ['form-digest-config', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_digest_config' as any)
        .select('*')
        .eq('form_id', formId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (configQuery.data) {
      setRecipients(configQuery.data.recipients || []);
      setIsActive(configQuery.data.is_active);
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (configQuery.data) {
        const { error } = await supabase
          .from('form_digest_config' as any)
          .update({ recipients, is_active: isActive, updated_at: new Date().toISOString() } as any)
          .eq('id', configQuery.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('form_digest_config' as any)
          .insert({
            form_id: formId,
            recipients,
            is_active: isActive,
            frequency: 'daily',
            created_by: user?.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Configuração de digest salva!');
      queryClient.invalidateQueries({ queryKey: ['form-digest-config', formId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao salvar configuração');
    },
  });

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('E-mail inválido');
      return;
    }
    if (recipients.includes(email)) {
      toast.error('E-mail já adicionado');
      return;
    }
    setRecipients(prev => [...prev, email]);
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setRecipients(prev => prev.filter(e => e !== email));
  };

  const lastSent = configQuery.data?.last_sent_at
    ? new Date(configQuery.data.last_sent_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Resumo Diário por E-mail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="digest-active" className="text-sm">Envio automático ativo</Label>
          <Switch id="digest-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Destinatários</Label>
          <div className="flex gap-2">
            <Input
              placeholder="email@exemplo.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              className="flex-1 h-9 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addEmail} className="h-9">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recipients.map(email => (
                <Badge key={email} variant="secondary" className="gap-1 text-xs py-1 px-2">
                  {email}
                  <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          O resumo é enviado diariamente às 8h (BRT) com todas as respostas recebidas nas últimas 24h.
        </p>

        {lastSent && (
          <p className="text-xs text-muted-foreground">
            Último envio: <strong>{lastSent}</strong>
          </p>
        )}

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full gap-2" size="sm">
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar configuração
        </Button>
      </CardContent>
    </Card>
  );
}
