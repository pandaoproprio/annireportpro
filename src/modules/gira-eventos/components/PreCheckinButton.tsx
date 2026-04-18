import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CalendarCheck } from 'lucide-react';
import { useEventPreCheckins } from '../hooks/useEventPreCheckins';

interface PreCheckinButtonProps {
  eventId?: string | null;
  formId?: string | null;
  registrationId?: string | null;
  responseId?: string | null;
  userIdentifier: string;
  fullName: string;
  primaryColor?: string;
}

export const PreCheckinButton: React.FC<PreCheckinButtonProps> = ({
  eventId, formId, registrationId, responseId, userIdentifier, fullName, primaryColor,
}) => {
  const { create } = useEventPreCheckins({ eventId, formId });
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (!userIdentifier.trim()) return;
    try {
      await create.mutateAsync({
        event_id: eventId,
        form_id: formId,
        registration_id: registrationId,
        response_id: responseId,
        user_identifier: userIdentifier,
        full_name: fullName,
      });
      setDone(true);
    } catch {
      // toast handled in hook
    }
  };

  if (done) {
    return (
      <div
        className="rounded-lg p-3 flex items-center gap-2 text-sm"
        style={{ background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Pré-checkin confirmado! Você é esperado(a) no evento.
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={create.isPending}
      className="w-full gap-2"
      style={primaryColor ? { background: primaryColor, color: '#fff' } : undefined}
    >
      <CalendarCheck className="w-4 h-4" />
      {create.isPending ? 'Confirmando...' : 'Confirmar presença antecipada (pré-checkin)'}
    </Button>
  );
};
