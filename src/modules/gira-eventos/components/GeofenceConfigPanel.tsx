import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MapPin, Crosshair, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { buildGoogleMapsUrl } from '../types';

interface GeofenceConfigPanelProps {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  preCheckinEnabled: boolean;
  onChange: (next: { lat: number | null; lng: number | null; radius: number; preCheckinEnabled: boolean }) => void;
}

export const GeofenceConfigPanel: React.FC<GeofenceConfigPanelProps> = ({
  lat, lng, radiusMeters, preCheckinEnabled, onChange,
}) => {
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não disponível neste dispositivo.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          radius: radiusMeters,
          preCheckinEnabled,
        });
        toast.success('Localização atual capturada.');
      },
      () => toast.error('Não foi possível obter sua localização.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const previewUrl = lat != null && lng != null ? buildGoogleMapsUrl(lat, lng, 'Local do evento') : null;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Checkin por geolocalização</h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="pre-checkin-switch" className="text-xs text-muted-foreground">Permitir pré-checkin</Label>
          <Switch
            id="pre-checkin-switch"
            checked={preCheckinEnabled}
            onCheckedChange={(v) => onChange({ lat, lng, radius: radiusMeters, preCheckinEnabled: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="geo-lat">Latitude</Label>
          <Input
            id="geo-lat"
            type="number"
            step="0.000001"
            value={lat ?? ''}
            onChange={(e) => onChange({ lat: e.target.value === '' ? null : Number(e.target.value), lng, radius: radiusMeters, preCheckinEnabled })}
            placeholder="Ex.: -15.793889"
          />
        </div>
        <div>
          <Label htmlFor="geo-lng">Longitude</Label>
          <Input
            id="geo-lng"
            type="number"
            step="0.000001"
            value={lng ?? ''}
            onChange={(e) => onChange({ lat, lng: e.target.value === '' ? null : Number(e.target.value), radius: radiusMeters, preCheckinEnabled })}
            placeholder="Ex.: -47.882778"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="geo-radius">Raio de tolerância (metros)</Label>
        <Input
          id="geo-radius"
          type="number"
          min={20}
          max={5000}
          value={radiusMeters}
          onChange={(e) => onChange({ lat, lng, radius: Number(e.target.value) || 200, preCheckinEnabled })}
        />
        <p className="text-xs text-muted-foreground mt-1">Padrão sugerido: 200 m. Aumente para locais grandes.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} className="gap-1.5">
          <Crosshair className="w-3.5 h-3.5" />
          Usar minha localização atual
        </Button>
        {previewUrl && (
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Visualizar no Google Maps
            </a>
          </Button>
        )}
      </div>

      {(lat == null || lng == null) && (
        <p className="text-xs text-muted-foreground">
          Configure latitude e longitude para habilitar o checkin por geolocalização.
        </p>
      )}
    </div>
  );
};
