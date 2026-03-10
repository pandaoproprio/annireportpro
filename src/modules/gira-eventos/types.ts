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
