import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';

interface RiskSummaryCardsProps {
  summary: {
    total: number;
    critical: number;
    high: number;
    active: number;
    resolved: number;
    materialized: number;
  };
}

export const RiskSummaryCards: React.FC<RiskSummaryCardsProps> = ({ summary }) => {
  if (summary.total === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <div>
            <p className="text-2xl font-bold text-destructive">{summary.critical}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-orange-500/30 bg-orange-50 dark:bg-orange-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-orange-500" />
          <div>
            <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
            <p className="text-xs text-muted-foreground">Altos</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{summary.active}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-green-500/30 bg-green-50 dark:bg-green-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold text-green-600">{summary.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
