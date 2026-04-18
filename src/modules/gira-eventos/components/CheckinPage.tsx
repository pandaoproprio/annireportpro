import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignatureCanvas } from './SignatureCanvas';
import { CheckCircle2, AlertCircle, MapPin, Fingerprint, PenTool, Crosshair, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventLocationLinks } from './EventLocationLinks';
import type { GiraEvent, EventRegistration } from '../types';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CheckinPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<GiraEvent | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signature state
  const [signatureType, setSignatureType] = useState<'drawing' | 'digital_accept'>('drawing');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [acceptDeclaration, setAcceptDeclaration] = useState(false);

  // Geolocation + validation
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [validation, setValidation] = useState<{ allowed: boolean; distance_meters?: number; message: string } | null>(null);
  const [validating, setValidating] = useState(false);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Seu dispositivo não permite geolocalização. Solicite checkin manual ao organizador.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.code === 1
          ? 'Permissão de localização negada. Habilite nas configurações do navegador para fazer checkin.'
          : 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  useEffect(() => { requestGeolocation(); }, []);

  // Validate against geofence whenever we have geo + event
  useEffect(() => {
    if (!geo || !event) return;
    const lat = (event as any).geofence_lat;
    const lng = (event as any).geofence_lng;
    if (lat == null || lng == null) {
      // geofence not configured: allow but flag
      setValidation({ allowed: true, message: 'Local sem geofence configurado.' });
      return;
    }
    setValidating(true);
    supabase.functions.invoke('validate-checkin-geofence', {
      body: { event_id: event.id, lat: geo.lat, lng: geo.lng },
    }).then(({ data, error: invokeError }) => {
      setValidating(false);
      if (invokeError || !data) {
        setValidation({ allowed: false, message: 'Falha ao validar localização. Tente novamente.' });
        return;
      }
      setValidation(data as any);
    });
  }, [geo, event]);

  useEffect(() => {
    async function load() {
      if (!eventId || !qrToken) {
        setError('Link de check-in inválido.');
        setLoading(false);
        return;
      }

      // Load event
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (!ev) { setError('Evento não encontrado.'); setLoading(false); return; }
      setEvent(ev as unknown as GiraEvent);

      // Load registration by QR token
      const { data: reg } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('qr_token', qrToken)
        .single();
      if (!reg) { setError('Inscrição não encontrada. QR Code inválido.'); setLoading(false); return; }
      setRegistration(reg as unknown as EventRegistration);
      setFullName(reg.name);
      setDocumentNumber(reg.document || '');

      // Check if already checked in
      const { data: existing } = await supabase
        .from('event_checkins')
        .select('id')
        .eq('registration_id', reg.id)
        .maybeSingle();
      if (existing) setAlreadyCheckedIn(true);

      setLoading(false);
    }
    load();
  }, [eventId, qrToken]);

  const handleCheckin = async () => {
    if (!registration || !event) return;

    if (!geo) {
      setError('Localização não disponível. Permita o acesso ao GPS.');
      return;
    }
    if (validation && !validation.allowed) {
      setError(validation.message);
      return;
    }
    if (signatureType === 'drawing' && !signatureData) {
      setError('Por favor, assine no campo acima.');
      return;
    }
    if (signatureType === 'digital_accept' && (!acceptDeclaration || !fullName.trim())) {
      setError('Preencha o nome completo e aceite a declaração.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const sigContent = signatureType === 'drawing'
        ? signatureData!
        : `ACEITE_DIGITAL|${fullName}|${documentNumber}|${new Date().toISOString()}`;
      const sigHash = await sha256(sigContent);

      const checkinData = {
        event_id: event.id,
        registration_id: registration.id,
        checkin_method: 'qr_code',
        signature_type: signatureType,
        signature_data: signatureType === 'drawing' ? signatureData : null,
        signature_hash: sigHash,
        full_name: fullName.trim(),
        document_number: documentNumber.trim() || null,
        ip_address: null,
        user_agent: navigator.userAgent,
        geolocation: { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy },
        distance_meters: validation?.distance_meters ?? null,
        is_manual: false,
        metadata: {
          timestamp_iso: new Date().toISOString(),
          screen_resolution: `${screen.width}x${screen.height}`,
          radius_validated: !!validation?.allowed,
        },
      };

      const { error: insertError } = await supabase
        .from('event_checkins')
        .insert(checkinData as any);

      if (insertError) {
        if (insertError.message?.includes('unique')) {
          setAlreadyCheckedIn(true);
        } else {
          throw insertError;
        }
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-lg" />
      </div>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Check-in já realizado!</h2>
            <p className="text-sm text-muted-foreground">
              Sua presença no evento <strong>{event?.title}</strong> já foi registrada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-[hsl(var(--success))] mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Check-in confirmado!</h2>
            <p className="text-sm text-muted-foreground">
              Presença registrada com sucesso no evento <strong>{event?.title}</strong>.
            </p>
            {geo && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>Localização registrada</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Sua assinatura eletrônica foi armazenada com hash SHA-256 para validade jurídica.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine which signature modes are available from event settings
  const settings = event?.settings as any ?? {};
  const allowedSignature = settings.signature_mode || 'both'; // 'drawing', 'digital_accept', 'both'

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        {event?.cover_image_url && (
          <div className="h-32 w-full overflow-hidden rounded-t-lg">
            <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Check-in: {event?.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {event && format(new Date(event.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="checkin-name">Nome completo *</Label>
            <Input
              id="checkin-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="checkin-doc">CPF / Documento</Label>
            <Input
              id="checkin-doc"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </div>

          {/* Signature Section */}
          <div className="border rounded-lg p-4 space-y-3 bg-accent/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              Assinatura Eletrônica de Presença
            </h3>

            {allowedSignature === 'both' ? (
              <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="drawing" className="flex-1 gap-1">
                    <PenTool className="w-3 h-3" /> Assinar
                  </TabsTrigger>
                  <TabsTrigger value="digital_accept" className="flex-1 gap-1">
                    <Fingerprint className="w-3 h-3" /> Aceite Digital
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="drawing">
                  <SignatureCanvas onSignatureChange={setSignatureData} />
                </TabsContent>
                <TabsContent value="digital_accept">
                  <DigitalAcceptForm
                    fullName={fullName}
                    accept={acceptDeclaration}
                    onAcceptChange={setAcceptDeclaration}
                    eventTitle={event?.title ?? ''}
                  />
                </TabsContent>
              </Tabs>
            ) : signatureType === 'drawing' || allowedSignature === 'drawing' ? (
              <SignatureCanvas onSignatureChange={setSignatureData} />
            ) : (
              <DigitalAcceptForm
                fullName={fullName}
                accept={acceptDeclaration}
                onAcceptChange={setAcceptDeclaration}
                eventTitle={event?.title ?? ''}
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}

          <Button
            onClick={handleCheckin}
            className="w-full"
            disabled={submitting || (!signatureData && signatureType === 'drawing') || (signatureType === 'digital_accept' && !acceptDeclaration)}
          >
            {submitting ? 'Registrando...' : 'Confirmar Presença'}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center leading-tight">
            Ao confirmar, você declara presença neste evento. Sua assinatura eletrônica será armazenada 
            com hash criptográfico SHA-256, timestamp e metadados para fins de comprovação legal, 
            conforme Lei 14.063/2020 (assinatura eletrônica simples).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const DigitalAcceptForm: React.FC<{
  fullName: string;
  accept: boolean;
  onAcceptChange: (v: boolean) => void;
  eventTitle: string;
}> = ({ fullName, accept, onAcceptChange, eventTitle }) => (
  <div className="space-y-3 pt-2">
    <div className="bg-card border rounded-lg p-3 text-xs text-foreground leading-relaxed">
      <p className="font-semibold mb-1">Declaração de Presença</p>
      <p>
        Eu, <strong>{fullName || '___________'}</strong>, declaro que estou presente no evento 
        "<strong>{eventTitle}</strong>" na data e horário registrados, e confirmo minha presença 
        através deste aceite digital.
      </p>
    </div>
    <div className="flex items-start gap-2">
      <Checkbox
        id="accept-declaration"
        checked={accept}
        onCheckedChange={(v) => onAcceptChange(!!v)}
      />
      <Label htmlFor="accept-declaration" className="text-xs text-muted-foreground leading-tight">
        Confirmo a veracidade desta declaração e concordo que ela possui validade como 
        assinatura eletrônica simples (Lei 14.063/2020).
      </Label>
    </div>
  </div>
);

export default CheckinPage;
