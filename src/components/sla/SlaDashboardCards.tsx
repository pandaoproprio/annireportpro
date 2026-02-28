import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface SlaSummary {
  noPrazo: number;
  atencao: number;
  atrasado: number;
  bloqueado: number;
  total: number;
}

interface SlaDashboardCardsProps {
  summary: SlaSummary;
}

export const SlaDashboardCards: React.FC<SlaDashboardCardsProps> = ({ summary }) => {
  if (summary.total === 0) return null;

  const items = [
    { label: 'No Prazo', value: summary.noPrazo, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Atenção', value: summary.atencao, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Atrasados', value: summary.atrasado, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Bloqueados', value: summary.bloqueado, icon: XCircle, color: 'text-red-800', bg: 'bg-red-100' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className={`${item.bg} border-none`}>
          <CardContent className="p-4 flex items-center gap-3">
            <item.icon className={`w-8 h-8 ${item.color}`} />
            <div>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
