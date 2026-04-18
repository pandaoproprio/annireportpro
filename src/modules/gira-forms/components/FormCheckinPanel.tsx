import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, AlertCircle, Search, Users, UserCheck,
  Lock, Camera, X, HelpCircle, ScanLine, Keyboard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Form } from '../types';
import { useEventPreCheckins } from '@/modules/gira-eventos/hooks/useEventPreCheckins';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState<{ name: string; time: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef<{ value: string; at: number } | null>(null);

  // Public access via edge functions (service role). The form_id in the URL
  // acts as the access credential for organizers — no login required.
  const dataQuery = useQuery({
    queryKey: ['public-checkin-data', formId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-form-checkins', {
        body: { form_id: formId },
      });
      if (error) throw error;
      const result = data as { ok: boolean; form?: Form; responses?: FormResponseRow[]; error?: string };
      if (!result.ok) throw new Error(result.error || 'Falha ao carregar dados.');
      return { form: result.form as Form, responses: (result.responses ?? []) as FormResponseRow[] };
    },
    enabled: !!formId,
    refetchInterval: 5000,
  });

  const formQuery = { data: dataQuery.data?.form, isLoading: dataQuery.isLoading };
  const responsesQuery = { data: dataQuery.data?.responses };

  useEffect(() => {
    if (!formId) return;
    const channel = supabase
      .channel(`form-checkins-${formId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'form_responses',
        filter: `form_id=eq.${formId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['public-checkin-data', formId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [formId, queryClient]);

  const checkinMutation = useMutation({
    mutationFn: async ({ responseId, name }: { responseId: string; name: string }) => {
      const { data, error } = await supabase.functions.invoke('manual-form-checkin', {
        body: { response_id: responseId },
      });
      if (error) throw error;
      const result = data as { ok: boolean; alreadyCheckedIn?: boolean; respondent_name?: string; error?: string };
      if (result.alreadyCheckedIn) {
        toast.info(`${result.respondent_name || name} já fez check-in.`);
        return null;
      }
      if (!result.ok) throw new Error(result.error || 'Falha ao registrar check-in.');
      return name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['public-checkin-data', formId] });
      if (name) {
        setLastCheckedIn({ name, time: format(new Date(), "HH:mm", { locale: ptBR }) });
        setTimeout(() => setLastCheckedIn(null), 6000);
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao registrar check-in'),
  });

  useEffect(() => {
    if (!qrToken || !responsesQuery.data) return;
    const match = responsesQuery.data.find(r => r.qr_token === qrToken);
    if (match) {
      if (match.checked_in_at) {
        toast.info(`${match.respondent_name || 'Participante'} já fez check-in.`);
      } else {
        checkinMutation.mutate({ responseId: match.id, name: match.respondent_name || 'Participante' });
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [qrToken, responsesQuery.data]);

  const handleScannedText = useCallback((text: string) => {
    if (!text) return;
    // Debounce: ignore same code within 3s
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.value === text && now - lastScannedRef.current.at < 3000) {
      return;
    }
    lastScannedRef.current = { value: text, at: now };

    const responses = responsesQuery.data ?? [];
    let match: FormResponseRow | undefined;

    // Try URL with token param
    try {
      const url = new URL(text);
      const token = url.searchParams.get('token');
      if (token) match = responses.find(r => r.qr_token === token);
    } catch {
      // not a URL
    }
    // Try raw token (UUID)
    if (!match) match = responses.find(r => r.qr_token === text);
    // Try 6-letter check-in code
    if (!match) {
      const code = text.trim().toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(code)) {
        match = responses.find(r => (r.checkin_code || '').toUpperCase() === code);
      }
    }

    if (!match) {
      toast.error('QR Code não corresponde a nenhuma inscrição deste evento.');
      return;
    }

    if (match.checked_in_at) {
      toast.info(`${match.respondent_name || 'Participante'} já fez check-in.`);
      return;
    }
    checkinMutation.mutate({ responseId: match.id, name: match.respondent_name || 'Participante' });
  }, [responsesQuery.data, checkinMutation]);

  const startScanner = useCallback(async () => {
    setScannerActive(true);
    // Wait next tick so <video> element is mounted
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!videoRef.current) {
      toast.error('Falha ao iniciar a câmera.');
      setScannerActive(false);
      return;
    }
    try {
      // Prefer rear camera on mobile devices
      let deviceId: string | undefined;
      try {
        // Request permission first to get labeled devices
        const tmpStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        // Stop the temp stream — zxing will reopen with the chosen device
        tmpStream.getTracks().forEach(t => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        // Try to find a rear/back camera by label heuristics
        const rear = videoDevices.find(d => /back|rear|environment|traseira|trás/i.test(d.label));
        deviceId = rear?.deviceId ?? videoDevices[videoDevices.length - 1]?.deviceId;
      } catch (permErr) {
        // If facingMode failed, fall back to default device selection
        console.warn('[Scanner] Could not pre-select rear camera:', permErr);
      }

      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err, ctrl) => {
          if (result) {
            handleScannedText(result.getText());
          }
          // Ignore NotFoundException (normal — no QR in frame yet)
        },
      );
      readerControlsRef.current = controls;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      console.error('[Scanner] Camera error:', err);
      if (/Permission|NotAllowed/i.test(msg)) {
        toast.error('Permissão de câmera negada. Habilite nas configurações do navegador.');
      } else if (/NotFound|Requested device not found/i.test(msg)) {
        toast.error('Nenhuma câmera encontrada neste dispositivo.');
      } else if (/Secure|https/i.test(msg)) {
        toast.error('A câmera só funciona em conexões HTTPS.');
      } else {
        toast.error('Não foi possível acessar a câmera. Tente recarregar a página.');
      }
      setScannerActive(false);
    }
  }, [handleScannedText]);

  const stopScanner = useCallback(() => {
    readerControlsRef.current?.stop();
    readerControlsRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
  }, []);

  useEffect(() => {
    return () => {
      readerControlsRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const { preCheckins } = useEventPreCheckins({ formId: formId ?? null });

  const responses = responsesQuery.data ?? [];
  const total = responses.length;
  const checkedIn = responses.filter(r => r.checked_in_at).length;
  const pending = total - checkedIn;
  const preCheckinCount = preCheckins.length;
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

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
      toast.error('⚠️ Essa pessoa já passou pelo check-in!', {
        description: `Presença registrada em ${format(new Date(response.checked_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      });
      return;
    }
    checkinMutation.mutate({ responseId: response.id, name: response.respondent_name || 'Participante' });
  };

  if (formQuery.isLoading) {
    return (
      <div className="min-h-screen bg-muted p-4">
        <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
      </div>
    );
  }

  // ─── Main Panel ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-5 sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold truncate">{formQuery.data?.title || 'Check-in'}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
              onClick={() => setShowHelp(v => !v)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{total}</div>
              <div className="text-[10px] opacity-80 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Convidados
              </div>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{preCheckinCount}</div>
              <div className="text-[10px] opacity-80">Pré-checkin</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{checkedIn}</div>
              <div className="text-[10px] opacity-80 flex items-center justify-center gap-1">
                <UserCheck className="w-3 h-3" /> Presentes
              </div>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{pending}</div>
              <div className="text-[10px] opacity-80">Aguardando</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-foreground/70 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-bold min-w-[3ch] text-right">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Help banner */}
      {showHelp && (
        <div className="bg-accent border-b border-border">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm text-accent-foreground">📖 Como usar este painel</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHelp(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-2.5 text-sm text-accent-foreground/80">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                <p><strong>Busca rápida:</strong> Digite o nome, CPF ou o código de 6 letras que o participante recebeu por e-mail.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                <p><strong>Câmera QR Code:</strong> Toque no ícone 📷 para ler o QR Code do e-mail do participante.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                <p><strong>Confirmar presença:</strong> Encontre a pessoa na lista e toque no botão <strong>"Confirmar presença"</strong>.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                <p><strong>Já confirmado?</strong> Se a pessoa já passou, aparecerá com um ✅ verde. Nenhuma ação necessária.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Success Banner */}
        {lastCheckedIn && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-300">Presença confirmada!</p>
              <p className="text-sm text-green-700 dark:text-green-400/80">
                <strong>{lastCheckedIn.name}</strong> — check-in às {lastCheckedIn.time}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setLastCheckedIn(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Search + QR Scanner Button */}
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nome, CPF ou código de 6 letras..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
                autoFocus
              />
            </div>
            <Button
              variant={scannerActive ? 'destructive' : 'outline'}
              className="w-full h-11 gap-2 text-sm font-medium"
              onClick={scannerActive ? stopScanner : startScanner}
            >
              {scannerActive ? (
                <>
                  <X className="w-4 h-4" />
                  Fechar câmera
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4" />
                  Escanear QR Code do participante
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              Dica: se não conseguir escanear, peça o código de 6 letras que o participante recebeu por e-mail
            </p>
          </CardContent>
        </Card>

        {/* Camera Scanner */}
        {scannerActive && (
          <Card className="border-primary/30 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium">Câmera ativa — aponte para o QR Code</span>
              </div>
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: 300 }}
                playsInline
                muted
                autoPlay
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                O participante encontra o QR Code no e-mail de confirmação da inscrição
              </p>
            </CardContent>
          </Card>
        )}

        {/* Participant List */}
        {total === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma inscrição ainda</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Quando alguém se inscrever, aparecerá aqui automaticamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && searchTerm.trim() && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhum resultado para "{searchTerm}"
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Verifique se o nome ou código está correto
                  </p>
                </CardContent>
              </Card>
            )}

            {filtered.map(response => {
              const isCheckedIn = !!response.checked_in_at;
              return (
                <Card
                  key={response.id}
                  className={`transition-all ${isCheckedIn ? 'bg-primary/5 border-primary/20' : 'hover:shadow-md'}`}
                >
                  <CardContent className="p-3.5 flex items-center gap-3">
                    {/* Status indicator */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCheckedIn
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCheckedIn ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-bold">
                          {(response.respondent_name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${isCheckedIn ? 'text-primary' : ''}`}>
                        {response.respondent_name || 'Sem nome'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {response.checkin_code && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5">
                            {response.checkin_code}
                          </Badge>
                        )}
                        {response.respondent_email && (
                          <span className="truncate">{response.respondent_email}</span>
                        )}
                      </div>
                      {isCheckedIn && (
                        <p className="text-[11px] text-primary/70 mt-0.5">
                          ✅ Presença confirmada em {format(new Date(response.checked_in_at!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    {isCheckedIn ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0 text-[11px]">
                        Presente
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={checkinMutation.isPending}
                        onClick={() => handleCheckin(response)}
                        className="shrink-0 gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Confirmar presença</span>
                        <span className="sm:hidden">Confirmar</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
