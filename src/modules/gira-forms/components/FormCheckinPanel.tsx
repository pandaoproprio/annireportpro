import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2, Search, Users, UserCheck, Clock, UserPlus,
  X, HelpCircle, ScanLine, Keyboard, RotateCcw, Sparkles, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
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

type CardKey = 'convidados' | 'pre_checkin' | 'presentes' | 'aguardando' | null;

const CARD_STYLES: Record<Exclude<CardKey, null>, { bg: string; ring: string; icon: string; label: string }> = {
  convidados: { bg: 'bg-[#3B82F6]', ring: 'ring-[#3B82F6]', icon: 'text-[#3B82F6]', label: 'Convidados' },
  pre_checkin: { bg: 'bg-[#8B5CF6]', ring: 'ring-[#8B5CF6]', icon: 'text-[#8B5CF6]', label: 'Pré-checkin' },
  presentes: { bg: 'bg-[#10B981]', ring: 'ring-[#10B981]', icon: 'text-[#10B981]', label: 'Presentes' },
  aguardando: { bg: 'bg-[#F59E0B]', ring: 'ring-[#F59E0B]', icon: 'text-[#F59E0B]', label: 'Aguardando' },
};

export default function FormCheckinPanel() {
  const { id: formId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('token');
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [openCard, setOpenCard] = useState<CardKey>(null);
  const [lastCheckedIn, setLastCheckedIn] = useState<{ name: string; time: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef<{ value: string; at: number } | null>(null);

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
    refetchInterval: 15000,
  });

  useEffect(() => { if (dataQuery.dataUpdatedAt) setLastUpdate(new Date(dataQuery.dataUpdatedAt)); }, [dataQuery.dataUpdatedAt]);

  const formData = dataQuery.data?.form;
  const responses = useMemo(() => dataQuery.data?.responses ?? [], [dataQuery.data]);

  // Realtime subscription
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
        setLastUpdate(new Date());
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [formId, queryClient]);

  const checkinMutation = useMutation({
    mutationFn: async ({ responseId, name, manual }: { responseId: string; name: string; manual?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('manual-form-checkin', {
        body: {
          response_id: responseId,
          admin_name: manual ? (profile?.name || 'Administrador') : undefined,
        },
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
        setLastCheckedIn({ name, time: format(new Date(), 'HH:mm', { locale: ptBR }) });
        setTimeout(() => setLastCheckedIn(null), 6000);
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao registrar check-in'),
  });

  const revertMutation = useMutation({
    mutationFn: async ({ responseId, name }: { responseId: string; name: string }) => {
      const { data, error } = await supabase.functions.invoke('manual-form-checkin', {
        body: { response_id: responseId, action: 'revert' },
      });
      if (error) throw error;
      const result = data as { ok: boolean; reverted?: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'Falha ao reverter.');
      return name;
    },
    onSuccess: (name) => {
      toast.success(`Check-in de ${name} revertido. Voltou para "Aguardando".`);
      queryClient.invalidateQueries({ queryKey: ['public-checkin-data', formId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao reverter check-in'),
  });

  // Auto-handle QR token URL
  useEffect(() => {
    if (!qrToken || responses.length === 0) return;
    const match = responses.find(r => r.qr_token === qrToken);
    if (match) {
      if (match.checked_in_at) toast.info(`${match.respondent_name || 'Participante'} já fez check-in.`);
      else checkinMutation.mutate({ responseId: match.id, name: match.respondent_name || 'Participante', manual: true });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [qrToken, responses]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScannedText = useCallback(async (text: string) => {
    if (!text) return;
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.value === text && now - lastScannedRef.current.at < 3000) return;
    lastScannedRef.current = { value: text, at: now };

    let match: FormResponseRow | undefined;
    let scannedToken: string | null = null;
    let isEventCheckinUrl = false;

    try {
      const url = new URL(text);
      scannedToken = url.searchParams.get('token');
      isEventCheckinUrl = /\/checkin\/[0-9a-f-]{36}/i.test(url.pathname);
      if (scannedToken) match = responses.find(r => r.qr_token === scannedToken);
    } catch { /* not a URL */ }

    if (!match) match = responses.find(r => r.qr_token === text);
    if (!match) {
      const code = text.trim().toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(code)) {
        match = responses.find(r => (r.checkin_code || '').toUpperCase() === code);
      }
    }

    if (!match && scannedToken && isEventCheckinUrl) {
      try {
        const { data: eventReg } = await supabase
          .from('event_registrations')
          .select('email, document, name')
          .eq('qr_token', scannedToken)
          .maybeSingle();
        if (eventReg) {
          const emailLc = (eventReg.email || '').toLowerCase().trim();
          const docDigits = (eventReg.document || '').replace(/\D/g, '');
          const nameLc = (eventReg.name || '').toLowerCase().trim();
          match = responses.find(r => {
            if (emailLc && (r.respondent_email || '').toLowerCase().trim() === emailLc) return true;
            if (docDigits) {
              for (const v of Object.values(r.answers || {})) {
                if (typeof v === 'string' && v.replace(/\D/g, '') === docDigits && docDigits.length >= 11) return true;
              }
            }
            if (nameLc && (r.respondent_name || '').toLowerCase().trim() === nameLc) return true;
            return false;
          });
        }
      } catch { /* ignore */ }
    }

    if (!match) { toast.error('QR Code não corresponde a nenhuma inscrição deste evento.'); return; }
    if (match.checked_in_at) { toast.info(`${match.respondent_name || 'Participante'} já fez check-in.`); return; }
    checkinMutation.mutate({ responseId: match.id, name: match.respondent_name || 'Participante', manual: true });
  }, [responses, checkinMutation]);

  const startScanner = useCallback(async () => {
    setScannerActive(true);
    await new Promise(r => setTimeout(r, 50));
    if (!videoRef.current) { toast.error('Falha ao iniciar a câmera.'); setScannerActive(false); return; }
    try {
      let deviceId: string | undefined;
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        tmp.getTracks().forEach(t => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const rear = videoDevices.find(d => /back|rear|environment|traseira|trás/i.test(d.label));
        deviceId = rear?.deviceId ?? videoDevices[videoDevices.length - 1]?.deviceId;
      } catch { /* fallback to default */ }

      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (result) handleScannedText(result.getText());
      });
      readerControlsRef.current = controls;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (/Permission|NotAllowed/i.test(msg)) toast.error('Permissão de câmera negada.');
      else if (/NotFound/i.test(msg)) toast.error('Nenhuma câmera encontrada.');
      else toast.error('Não foi possível acessar a câmera.');
      setScannerActive(false);
    }
  }, [handleScannedText]);

  const stopScanner = useCallback(() => {
    readerControlsRef.current?.stop();
    readerControlsRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerActive(false);
  }, []);

  useEffect(() => () => {
    readerControlsRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const { preCheckins } = useEventPreCheckins({ formId: formId ?? null });

  const total = responses.length;
  const present = responses.filter(r => r.checked_in_at);
  const checkedIn = present.length;
  const pending = responses.filter(r => !r.checked_in_at);
  const pendingCount = pending.length;
  const preCheckinCount = preCheckins.length;
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Match pre-checkins to responses
  const preCheckinRows = useMemo(() => {
    return preCheckins.map(pc => {
      const r = responses.find(x =>
        (pc.response_id && x.id === pc.response_id) ||
        ((x.respondent_email || '').toLowerCase().trim() === pc.user_identifier.toLowerCase()),
      );
      return {
        id: pc.id,
        name: pc.full_name || r?.respondent_name || pc.user_identifier,
        email: r?.respondent_email || pc.user_identifier,
        confirmed_at: pc.confirmed_at,
      };
    });
  }, [preCheckins, responses]);

  const progressColor = percentage < 30 ? 'bg-red-500' : percentage < 70 ? 'bg-yellow-500' : 'bg-green-500';

  const filteredForSearch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return responses.filter(r => {
      const name = (r.respondent_name || '').toLowerCase();
      const email = (r.respondent_email || '').toLowerCase();
      const code = (r.checkin_code || '').toLowerCase();
      return name.includes(term) || email.includes(term) || code.includes(term);
    }).slice(0, 20);
  }, [responses, searchTerm]);

  if (dataQuery.isLoading) {
    return <div className="min-h-screen bg-muted p-4"><Skeleton className="h-96 w-full max-w-2xl mx-auto" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-5 sticky top-0 z-10 shadow-md">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold truncate">{formData?.title || 'Check-in'}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
              onClick={() => setShowHelp(v => !v)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>

          {/* Colored, clickable cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <button
              onClick={() => setOpenCard('convidados')}
              className="rounded-lg p-3 text-left text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#3B82F6' }}
            >
              <div className="flex items-center gap-1.5 text-[11px] opacity-90"><Users className="w-3 h-3" /> Convidados</div>
              <div className="text-2xl font-bold mt-0.5">{total}</div>
            </button>
            <button
              onClick={() => setOpenCard('pre_checkin')}
              className="rounded-lg p-3 text-left text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              <div className="flex items-center gap-1.5 text-[11px] opacity-90"><Sparkles className="w-3 h-3" /> Pré-checkin</div>
              <div className="text-2xl font-bold mt-0.5">{preCheckinCount}</div>
            </button>
            <button
              onClick={() => setOpenCard('presentes')}
              className="rounded-lg p-3 text-left text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#10B981' }}
            >
              <div className="flex items-center gap-1.5 text-[11px] opacity-90"><UserCheck className="w-3 h-3" /> Presentes</div>
              <div className="text-2xl font-bold mt-0.5">{checkedIn}</div>
            </button>
            <button
              onClick={() => setOpenCard('aguardando')}
              className="rounded-lg p-3 text-left text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#F59E0B' }}
            >
              <div className="flex items-center gap-1.5 text-[11px] opacity-90"><Clock className="w-3 h-3" /> Aguardando</div>
              <div className="text-2xl font-bold mt-0.5">{pendingCount}</div>
            </button>
          </div>

          {/* Smart progress bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div className={`h-full ${progressColor} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-sm font-bold min-w-[3ch] text-right">{percentage}%</span>
          </div>
          <p className="text-[11px] opacity-80 mt-1.5 text-right">
            Atualizado às {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })} • atualização em tempo real
          </p>
        </div>
      </div>

      {/* Help banner */}
      {showHelp && (
        <div className="bg-accent border-b border-border">
          <div className="max-w-3xl mx-auto p-4 text-sm text-accent-foreground/90 space-y-2">
            <p><strong>Como usar:</strong></p>
            <p>• Clique em qualquer card acima para abrir a lista correspondente.</p>
            <p>• Use a busca para localizar alguém e fazer <strong>check-in manual</strong> (sem geolocalização — exceção administrativa).</p>
            <p>• A câmera lê o QR Code recebido por e-mail. O auto check-in público exige geolocalização válida e horário do evento.</p>
            <p>• Toque em <RotateCcw className="inline w-3 h-3" /> para reverter um check-in lançado por engano.</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Success banner */}
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

        {/* Quick search for manual check-in */}
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Busca rápida por nome, e-mail ou código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Inline search results */}
            {searchTerm.trim() && (
              <div className="border rounded-lg divide-y max-h-72 overflow-auto">
                {filteredForSearch.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado para "{searchTerm}".</div>
                ) : (
                  filteredForSearch.map(r => {
                    const isCheckedIn = !!r.checked_in_at;
                    return (
                      <div key={r.id} className="p-2.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.respondent_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.respondent_email}</p>
                        </div>
                        {isCheckedIn ? (
                          <Badge style={{ backgroundColor: '#10B981' }} className="text-white border-0 text-[11px]">Presente</Badge>
                        ) : (
                          <Button
                            size="sm"
                            disabled={checkinMutation.isPending}
                            onClick={() => checkinMutation.mutate({ responseId: r.id, name: r.respondent_name || 'Participante', manual: true })}
                            className="shrink-0 gap-1.5"
                            style={{ backgroundColor: '#F59E0B' }}
                          >
                            <UserPlus className="w-4 h-4" />
                            Check-in manual
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <Button
              variant={scannerActive ? 'destructive' : 'outline'}
              className="w-full h-11 gap-2 text-sm font-medium"
              onClick={scannerActive ? stopScanner : startScanner}
            >
              {scannerActive ? (<><X className="w-4 h-4" /> Fechar câmera</>) : (<><ScanLine className="w-4 h-4" /> Escanear QR Code do participante</>)}
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              Check-in manual (pelo administrador) é exceção e dispensa geolocalização — sempre fica registrado quem confirmou.
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
              <video ref={videoRef} className="w-full rounded-lg bg-black" style={{ maxHeight: 300 }} playsInline muted autoPlay />
            </CardContent>
          </Card>
        )}

        {/* Geofence info */}
        {formData?.geofence_lat != null && (
          <Card>
            <CardContent className="p-3 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                Check-in público exige estar dentro de <strong>{formData.geofence_radius_meters ?? 200} m</strong> do local
                {formData.event_starts_at && formData.event_ends_at && (
                  <> e dentro do horário <strong>{format(new Date(formData.event_starts_at), "dd/MM HH:mm", { locale: ptBR })}–{format(new Date(formData.event_ends_at), 'HH:mm', { locale: ptBR })}</strong></>
                )}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: lista por card */}
      <Dialog open={openCard !== null} onOpenChange={(o) => !o && setOpenCard(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              {openCard && (
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: openCard === 'convidados' ? '#3B82F6' : openCard === 'pre_checkin' ? '#8B5CF6' : openCard === 'presentes' ? '#10B981' : '#F59E0B' }} />
              )}
              {openCard === 'convidados' && `Convidados (${total})`}
              {openCard === 'pre_checkin' && `Pré-checkin (${preCheckinCount})`}
              {openCard === 'presentes' && `Presentes (${checkedIn})`}
              {openCard === 'aguardando' && `Aguardando (${pendingCount})`}
            </DialogTitle>
            <DialogDescription>
              {openCard === 'aguardando' && 'Use o botão para fazer check-in manual.'}
              {openCard === 'presentes' && 'Use o botão para reverter um check-in.'}
              {openCard === 'pre_checkin' && 'Pessoas que confirmaram presença antecipada.'}
              {openCard === 'convidados' && 'Todas as inscrições confirmadas.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {openCard === 'convidados' && responses.map(r => (
                <RowItem key={r.id} name={r.respondent_name} email={r.respondent_email} timestamp={r.submitted_at} timestampLabel="Inscrito" />
              ))}

              {openCard === 'pre_checkin' && (preCheckinRows.length === 0 ? (
                <EmptyState text="Nenhum pré-checkin registrado." />
              ) : preCheckinRows.map(p => (
                <RowItem key={p.id} name={p.name} email={p.email} timestamp={p.confirmed_at} timestampLabel="Pré-checkin" />
              )))}

              {openCard === 'presentes' && (present.length === 0 ? (
                <EmptyState text="Ninguém confirmou presença ainda." />
              ) : present.map(r => (
                <RowItem
                  key={r.id}
                  name={r.respondent_name}
                  email={r.respondent_email}
                  timestamp={r.checked_in_at}
                  timestampLabel="Check-in"
                  badge={r.checked_in_by?.startsWith('manual') ? `Manual${r.checked_in_by.includes(':') ? ` • ${r.checked_in_by.split(':')[1]}` : ''}` : null}
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revertMutation.isPending}
                      onClick={() => revertMutation.mutate({ responseId: r.id, name: r.respondent_name || 'Participante' })}
                      className="gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reverter
                    </Button>
                  }
                />
              )))}

              {openCard === 'aguardando' && (pending.length === 0 ? (
                <EmptyState text="Todos os convidados já fizeram check-in!" />
              ) : pending.map(r => (
                <RowItem
                  key={r.id}
                  name={r.respondent_name}
                  email={r.respondent_email}
                  timestamp={r.submitted_at}
                  timestampLabel="Inscrito"
                  action={
                    <Button
                      size="sm"
                      disabled={checkinMutation.isPending}
                      onClick={() => checkinMutation.mutate({ responseId: r.id, name: r.respondent_name || 'Participante', manual: true })}
                      className="gap-1.5 text-white"
                      style={{ backgroundColor: '#F59E0B' }}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Check-in manual
                    </Button>
                  }
                />
              )))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowItem({
  name, email, timestamp, timestampLabel, badge, action,
}: {
  name: string | null;
  email: string | null;
  timestamp: string | null;
  timestampLabel: string;
  badge?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
        {(name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name || 'Sem nome'}</p>
        {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
        {timestamp && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {timestampLabel}: {format(new Date(timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
        {badge && <Badge variant="outline" className="mt-1 text-[10px]">{badge}</Badge>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
