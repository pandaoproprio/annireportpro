import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Bell, BellOff, CheckCircle, Loader2, RefreshCw, Scan, ShieldAlert, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { RiskSuggestion, RiskAlert, HealthData } from '@/hooks/useRiskIntelligence';
import type { RiskFormData } from '@/hooks/useProjectRisks';

interface RiskPredictiveDashboardProps {
  suggestions: RiskSuggestion[];
  alerts: RiskAlert[];
  healthData: HealthData | null;
  isScanning: boolean;
  isRecalculating: boolean;
  unreadAlerts: number;
  onRunAutoDetect: () => void;
  onRecalculateScores: () => void;
  onAcceptSuggestion: (s: RiskSuggestion, create: (d: RiskFormData) => Promise<boolean | undefined>) => void;
  onDismissSuggestion: (id: string) => void;
  onMarkAlertRead: (id: string) => void;
  onMarkAllAlertsRead: () => void;
  onCreateRisk: (d: RiskFormData) => Promise<boolean | undefined>;
}

const trendIcon = (trend: string) => {
  if (trend === 'improving') return <TrendingDown className="w-4 h-4 text-green-600" />;
  if (trend === 'declining') return <TrendingUp className="w-4 h-4 text-destructive" />;
  return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
};

const trendLabel = (trend: string) => {
  if (trend === 'improving') return 'Melhorando';
  if (trend === 'declining') return 'Piorando';
  return 'Estável';
};

const healthColor = (score: number) => {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-orange-500';
  return 'text-destructive';
};

const severityBadge = (sev: string) => {
  if (sev === 'high') return 'destructive' as const;
  if (sev === 'medium') return 'default' as const;
  return 'secondary' as const;
};

export const RiskPredictiveDashboard: React.FC<RiskPredictiveDashboardProps> = ({
  suggestions, alerts, healthData, isScanning, isRecalculating, unreadAlerts,
  onRunAutoDetect, onRecalculateScores, onAcceptSuggestion, onDismissSuggestion,
  onMarkAlertRead, onMarkAllAlertsRead, onCreateRisk,
}) => {
  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onRunAutoDetect} disabled={isScanning} className="gap-2">
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
          Varredura Automática de Riscos
        </Button>
        <Button onClick={onRecalculateScores} disabled={isRecalculating} variant="secondary" className="gap-2">
          {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Recalcular Scores Dinâmicos
        </Button>
      </div>

      {/* Health Score */}
      {healthData && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Saúde do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className={`text-4xl font-bold ${healthColor(healthData.health_score)}`}>
                  {healthData.health_score}
                </p>
                <p className="text-xs text-muted-foreground">de 100</p>
              </div>
              <div className="flex-1">
                <Progress value={healthData.health_score} className="h-3" />
              </div>
              <div className="flex items-center gap-1 text-sm">
                {trendIcon(healthData.health_trend)}
                <span className="text-muted-foreground">{trendLabel(healthData.health_trend)}</span>
              </div>
            </div>
            {healthData.key_findings?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Principais Achados</h4>
                <ul className="space-y-1">
                  {healthData.key_findings.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                Alertas
                {unreadAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1">{unreadAlerts}</Badge>
                )}
              </CardTitle>
              {unreadAlerts > 0 && (
                <Button variant="ghost" size="sm" onClick={onMarkAllAlertsRead} className="gap-1 text-xs">
                  <BellOff className="w-3 h-3" /> Marcar todos como lidos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 10).map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  alert.is_read ? 'bg-muted/30' : 'bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-destructive' : 'text-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${alert.is_read ? 'text-muted-foreground' : ''}`}>{alert.title}</span>
                    <Badge variant={severityBadge(alert.severity)} className="text-xs">{alert.alert_type}</Badge>
                  </div>
                  {alert.description && (
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  )}
                </div>
                {!alert.is_read && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onMarkAlertRead(alert.id)}>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Riscos Detectados Automaticamente
              <Badge variant="secondary">{suggestions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{s.title}</span>
                      <Badge variant="outline" className="text-xs">{s.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{s.description}</p>
                    {(s.source_data as any)?.reasoning && (
                      <p className="text-xs text-primary/80 italic">💡 {(s.source_data as any).reasoning}</p>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>Prob: {s.probability}</span>
                      <span>Impacto: {s.impact}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onAcceptSuggestion(s, onCreateRisk)}>
                      <CheckCircle className="w-3 h-3" /> Adotar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => onDismissSuggestion(s.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
