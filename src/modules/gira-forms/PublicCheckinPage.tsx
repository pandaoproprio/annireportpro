import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, MapPin, Loader2, Navigation } from 'lucide-react';

type Status =
  | 'idle'
  | 'requesting_location'
  | 'submitting'
  | 'success'
  | 'already'
  | 'out_of_range'
  | 'error';

export default function PublicCheckinPage() {
  const { code: paramCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [code, setCode] = useState((paramCode || '').toUpperCase());
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');
  const [name, setName] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const submit = async (codeOrToken: { code?: string; token?: string }) => {
    setStatus('requesting_location');
    setMessage('Solicitando sua localização…');

    let lat: number | null = null;
    let lng: number | null = null;

    if (!('geolocation' in navigator)) {
      setStatus('error');
      setMessage('Seu navegador não suporta geolocalização. Tente em outro dispositivo.');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (err: any) {
      setStatus('error');
      if (err?.code === 1) {
        setMessage('Permissão de localização negada. Habilite o GPS e permita o acesso à localização nas configurações do navegador.');
      } else if (err?.code === 3) {
        setMessage('Tempo esgotado ao obter localização. Verifique se o GPS está ativo e tente novamente.');
      } else {
        setMessage('Não foi possível obter sua localização. Verifique o GPS.');
      }
      return;
    }

    setStatus('submitting');
    setMessage('Confirmando presença…');

    try {
      const { data, error } = await supabase.functions.invoke('submit-public-checkin', {
        body: { ...codeOrToken, lat, lng },
      });

      if (error) {
        setStatus('error');
        setMessage('Falha ao registrar check-in. Tente novamente em instantes.');
        return;
      }

      const result = data as {
        ok: boolean;
        error?: string;
        alreadyCheckedIn?: boolean;
        outOfRange?: boolean;
        respondent_name?: string;
        form_title?: string;
        distance_meters?: number;
      };

      if (result.alreadyCheckedIn) {
        setStatus('already');
        setName(result.respondent_name || null);
        setMessage(result.error || 'Você já fez check-in.');
        return;
      }
      if (result.outOfRange) {
        setStatus('out_of_range');
        setDistance(result.distance_meters ?? null);
        setMessage(result.error || 'Você está fora da área do evento.');
        return;
      }
      if (!result.ok) {
        setStatus('error');
        setMessage(result.error || 'Não foi possível registrar o check-in.');
        return;
      }

      setStatus('success');
      setName(result.respondent_name || null);
      setFormTitle(result.form_title || null);
      setDistance(result.distance_meters ?? null);
      setMessage('Presença confirmada com sucesso!');
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  };

  // Auto-submit when accessed via QR token in URL
  useEffect(() => {
    if (tokenParam) {
      submit({ token: tokenParam });
    } else if (paramCode && /^[A-Z0-9]{6}$/.test(paramCode.toUpperCase())) {
      submit({ code: paramCode.toUpperCase() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
      setStatus('error');
      setMessage('Código inválido. Deve ter 6 letras/números.');
      return;
    }
    submit({ code: trimmed });
  };

  const isLoading = status === 'requesting_location' || status === 'submitting';

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Confirmação de Presença</CardTitle>
          {formTitle && <p className="text-sm text-muted-foreground mt-1">{formTitle}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success */}
          {status === 'success' && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <div>
                <p className="font-semibold text-lg text-foreground">Presença confirmada!</p>
                {name && <p className="text-sm text-muted-foreground mt-1">Olá, <strong>{name}</strong></p>}
                {distance != null && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <Navigation className="w-3 h-3" /> A {Math.round(distance)} m do local
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Bom evento! Já pode guardar o celular.</p>
            </div>
          )}

          {/* Already checked in */}
          {status === 'already' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center space-y-2">
              <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto" />
              <p className="font-semibold text-foreground">{name ? `${name}, você já fez check-in` : 'Check-in já registrado'}</p>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {/* Out of range */}
          {status === 'out_of_range' && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 text-center space-y-3">
              <Navigation className="w-12 h-12 text-destructive mx-auto" />
              <p className="font-semibold text-foreground">Você está fora do local do evento</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={() => submit({ code: code.trim().toUpperCase() })} variant="outline" className="w-full">
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{message}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 p-6">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {/* Manual code form (always available unless success) */}
          {status !== 'success' && status !== 'already' && !isLoading && (
            <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 border-t">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Código de check-in (6 letras/números)
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  className="text-center font-mono text-lg tracking-widest h-12"
                  autoFocus={!paramCode}
                />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <MapPin className="w-4 h-4" />
                Confirmar presença com localização
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Ao confirmar, autorizamos o uso da sua localização apenas para validar que você está no local do evento.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
