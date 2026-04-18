import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { buildGoogleMapsUrl, buildWazeUrl, buildAppleMapsUrl } from '../types';

interface EventLocationLinksProps {
  lat: number | null;
  lng: number | null;
  address?: string | null;
  primaryColor?: string;
  compact?: boolean;
}

export const EventLocationLinks: React.FC<EventLocationLinksProps> = ({ lat, lng, address, primaryColor, compact }) => {
  if (lat == null || lng == null) {
    if (!address) return null;
    return (
      <div className="text-sm flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        {address}
      </div>
    );
  }

  const linkStyle: React.CSSProperties = primaryColor
    ? { borderColor: primaryColor, color: primaryColor }
    : {};

  const links = [
    { label: 'Google Maps', href: buildGoogleMapsUrl(lat, lng, address ?? undefined) },
    { label: 'Waze', href: buildWazeUrl(lat, lng) },
    { label: 'Apple Maps', href: buildAppleMapsUrl(lat, lng) },
  ];

  return (
    <div className="space-y-2">
      {address && !compact && (
        <p className="text-sm flex items-start gap-1.5">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{address}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium rounded-md border px-2.5 py-1.5 hover:opacity-80 transition-opacity"
            style={linkStyle}
          >
            {l.label}
            <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  );
};
