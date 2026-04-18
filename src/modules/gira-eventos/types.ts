export interface GiraEvent {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_end_date: string | null;
  category: string;
  status: 'ativo' | 'encerrado' | 'cancelado';
  max_participants: number | null;
  cover_image_url: string | null;
  linked_form_id: string | null;
  settings: Record<string, unknown>;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius_meters: number;
  pre_checkin_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  status: string;
  registered_at: string;
  user_id: string | null;
  qr_token: string | null;
  registration_number: number | null;
}

export interface EventCheckin {
  id: string;
  event_id: string;
  registration_id: string;
  checkin_at: string;
  checkin_method: string;
  signature_type: 'drawing' | 'digital_accept';
  signature_data: string | null;
  signature_hash: string;
  full_name: string;
  document_number: string | null;
  ip_address: string | null;
  user_agent: string | null;
  geolocation: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  distance_meters: number | null;
  is_manual: boolean;
  manual_by: string | null;
}

export interface EventPreCheckin {
  id: string;
  event_id: string | null;
  form_id: string | null;
  registration_id: string | null;
  response_id: string | null;
  user_identifier: string;
  full_name: string;
  channel: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  confirmed_at: string;
}

export type ParticipantState = 'convidado' | 'pre_checkin' | 'presente' | 'ausente';

export const PARTICIPANT_STATE_LABELS: Record<ParticipantState, string> = {
  convidado: 'Convidado',
  pre_checkin: 'Pré-checkin',
  presente: 'Presente',
  ausente: 'Ausente',
};

export interface EventCertificate {
  id: string;
  event_id: string;
  registration_id: string;
  checkin_id: string;
  certificate_hash: string;
  issued_at: string;
  participant_name: string;
  participant_document: string | null;
  event_title: string;
  event_date: string;
  event_duration_hours: number | null;
  verification_url: string | null;
}

export const EVENT_CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'educacional', label: 'Educacional' },
  { value: 'comunitario', label: 'Comunitário' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'festival', label: 'Festival' },
];

export const EVENT_STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

/** Build a Google Maps URL pointing to the given coordinates. */
export function buildGoogleMapsUrl(lat: number, lng: number, label?: string): string {
  const q = label ? `${lat},${lng}(${encodeURIComponent(label)})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Build a Waze deep link for the given coordinates. */
export function buildWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/** Build an Apple Maps URL for the given coordinates. */
export function buildAppleMapsUrl(lat: number, lng: number): string {
  return `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
}
