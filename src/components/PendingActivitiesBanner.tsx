import React from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { AlertCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PendingActivitiesBanner: React.FC = () => {
  const { activities } = useAppData();

  const today = new Date();
  const lastActivityDate = activities.length > 0
    ? new Date(activities.reduce((latest, a) => a.date > latest ? a.date : latest, activities[0].date))
    : null;

  const daysSinceLastActivity = lastActivityDate
    ? differenceInDays(today, lastActivityDate)
    : null;

  // Show banner if no activities exist, or none in the last 7 days
  const showReminder = activities.length === 0 || (daysSinceLastActivity !== null && daysSinceLastActivity >= 7);

  if (!showReminder) return null;

  const message = activities.length === 0
    ? 'Você ainda não registrou nenhuma atividade neste projeto. Comece agora!'
    : `Faz ${daysSinceLastActivity} dias desde a última atividade registrada. Mantenha seu diário atualizado!`;

  return (
    <Alert variant="default" className="border-primary bg-primary/10 mb-4">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertDescription className="text-primary font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
};
