import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, AlertCircle, Search, Users, UserCheck,
  Lock, Camera, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Form } from '../types';

interface FormResponseRow {
  id: string;
  form_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
  checkin_code: string | null;
  qr_token: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
}

export default function FormCheckinPanel() {
  const { id: formId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('token');
  const queryClient = useQueryClient();

  const [authenticated, setAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthenticated(true);
    });
  }, []);

  // Load form
  const formQuery = useQuery({
    queryKey: ['checkin-form', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId!)
        .single();
      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!formId && authenticated,
  });

  // Load responses
  const responsesQuery = useQuery({
    queryKey: ['checkin-responses', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId!)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FormResponseRow[];
    },
    enabled: !!formId && authenticated,
    refetchInterval: 5000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!formId || !authenticated) return;
    const channel = supabase
      .channel(`form-checkins-${formId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'form_responses',
        filter: `form_id=eq.${formId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['checkin-responses', formId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [formId, authenticated, queryClient]);

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (responseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('form_responses')
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.id || null,
        } as any)
        .eq('id', responseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-responses', formId] });
      toast.success('Check-in realizado com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar check-in'),
  });

  // Auto-checkin via QR token in URL
  useEffect(() => {
    if (!qrToken || !authenticated || !responsesQuery.data) return;
    const match = responsesQuery.data.find(r => r.qr_token === qrToken);
    if (match) {
      if (match.checked_in_at) {
        toast.info(`${match.respondent_name || 'Participante'} já fez check-in.`);
      } else {
        checkinMutation.mutate(match.id);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [qrToken, authenticated, responsesQuery.data]);

  // Scanner logic
  const startScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScannerActive(true);
    } catch {
      toast.error('Não foi possível acessar a câmera.');
    }
  }, []);

  const stopScanner = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScannerActive(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoginError('Credenciais inválidas.');
    } else {
      setAuthenticated(true);
    }
  };

  // ─── Derived data ───────────────────────────────────────────
  const responses = responsesQuery.data ?? [];
  const total = responses.length;
  const checkedIn = responses.filter(r => r.checked_in_at).length;

  const filtered = searchTerm.trim()
    ? responses.filter(r => {
        const term = searchTerm.trim().toLowerCase();
        const name = (r.respondent_name || '').toLowerCase();
        const email = (r.respondent_email || '').toLowerCase();
        const code = (r.checkin_code || '').toLowerCase();
        const answersStr = JSON.stringify(r.answers || {}).toLowerCase();
        return name.includes(term) || email.includes(term) || code.includes(term) || answersStr.includes(term);
      })
    : responses;

  const handleCheckin = (response: FormResponseRow) => {
    if (response.checked_in_at) {
      toast.error('Este participante já fez check-in!', {
        description: `Check-in realizado em ${format(new Date(response.checked_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      });
      return;
    }
    checkinMutation.mutate(response.id);
  };

  // ─── Render ─────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-lg">Painel de Check-in</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acesso restrito à equipe do evento
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="email"
                placeholder="E-mail"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                autoFocus
              />
              <Input
                type="password"
                placeholder="Senha"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
              {loginError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {loginError}
                </p>
              )}
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (formQuery.isLoading) {
    return (
      <div className="min-h-screen bg-muted p-4">
        <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header with counters */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold truncate">{formQuery.data?.title || 'Check-in'}</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{total} inscritos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span className="text-sm font-medium">{checkedIn} presentes</span>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary" className="text-sm font-bold">
                {total > 0 ? Math.round((checkedIn / total) * 100) : 0}%
              </Badge>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-foreground/60 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (checkedIn / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Search and Scanner */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <Button
            variant={scannerActive ? 'destructive' : 'outline'}
            size="icon"
            onClick={scannerActive ? stopScanner : startScanner}
          >
            {scannerActive ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </Button>
        </div>

        {/* Camera Scanner */}
        {scannerActive && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                Aponte a câmera para o QR Code do participante
              </p>
              <video
                ref={videoRef}
                className="w-full rounded-lg"
                style={{ maxHeight: 300 }}
              />
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                💡 Dica: Peça ao participante para abrir o QR Code no e-mail de confirmação
              </p>
            </CardContent>
          </Card>
        )}

        {/* Participant List */}
        <div className="space-y-2">
          {filtered.length === 0 && searchTerm.trim() && (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum participante encontrado para "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          )}

          {filtered.map(response => {
            const isCheckedIn = !!response.checked_in_at;
            return (
              <Card
                key={response.id}
                className={`transition-all ${isCheckedIn ? 'opacity-70' : ''}`}
                style={isCheckedIn ? { borderLeft: '4px solid hsl(var(--primary))' } : undefined}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {response.respondent_name || 'Sem nome'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {response.respondent_email && (
                        <span className="truncate">{response.respondent_email}</span>
                      )}
                      {response.checkin_code && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {response.checkin_code}
                        </Badge>
                      )}
                    </div>
                    {isCheckedIn && (
                      <p className="text-[10px] text-primary mt-0.5">
                        ✓ Check-in em {format(new Date(response.checked_in_at!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isCheckedIn ? 'ghost' : 'default'}
                    disabled={isCheckedIn || checkinMutation.isPending}
                    onClick={() => handleCheckin(response)}
                    className="shrink-0"
                  >
                    {isCheckedIn ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Check-in
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
