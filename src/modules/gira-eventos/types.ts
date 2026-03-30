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
  settings: Record<string, unknown>;
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
}

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
