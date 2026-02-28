import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { PerformanceConfig } from '@/hooks/usePerformanceTracking';

interface PerformanceConfigPanelProps {
  config: PerformanceConfig | undefined;
  onSave: (values: { stale_draft_threshold_hours?: number; wip_limit?: number }) => void;
  isSaving: boolean;
}

export const PerformanceConfigPanel: React.FC<PerformanceConfigPanelProps> = ({ config, onSave, isSaving }) => {
  const [thresholdHours, setThresholdHours] = useState(config?.stale_draft_threshold_hours ?? 168);
  const [wipLimit, setWipLimit] = useState(config?.wip_limit ?? 5);

  React.useEffect(() => {
    if (config) {
      setThresholdHours(config.stale_draft_threshold_hours);
      setWipLimit(config.wip_limit);
    }
  }, [config]);

  const handleSave = () => {
    if (thresholdHours < 1) {
      toast.error('O limiar deve ser de pelo menos 1 hora.');
      return;
    }
    if (wipLimit < 1) {
      toast.error('O limite WIP deve ser de pelo menos 1.');
      return;
    }
    onSave({ stale_draft_threshold_hours: thresholdHours, wip_limit: wipLimit });
    toast.success('Configuração de performance salva.');
  };

  const formatPreview = (hours: number): string => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuração de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="threshold">Limiar de Rascunho em Risco (horas)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="threshold"
                type="number"
                min={1}
                max={8760}
                value={thresholdHours}
                onChange={e => setThresholdHours(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">
                = {formatPreview(thresholdHours)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rascunhos com mais de {formatPreview(thresholdHours)} serão sinalizados como "em risco".
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wip">Limite de WIP (rascunhos por usuário)</Label>
            <Input
              id="wip"
              type="number"
              min={1}
              max={100}
              value={wipLimit}
              onChange={e => setWipLimit(Number(e.target.value))}
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">
              Alerta visual quando o usuário exceder {wipLimit} rascunhos ativos.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="w-4 h-4 mr-1.5" />
            Salvar Configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
