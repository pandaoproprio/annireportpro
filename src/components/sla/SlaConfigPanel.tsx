import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { SlaConfig } from '@/types/sla';
import { SLA_REPORT_TYPE_LABELS, formatSlaDuration } from '@/types/sla';
import { useSlaTracking } from '@/hooks/useSlaTracking';

export const SlaConfigPanel: React.FC = () => {
  const { configs, updateConfig } = useSlaTracking();
  const [localConfigs, setLocalConfigs] = useState<SlaConfig[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (configs.length > 0) setLocalConfigs(configs);
  }, [configs]);

  const handleSave = async (config: SlaConfig) => {
    setSaving(config.id);
    try {
      await updateConfig.mutateAsync(config);
      toast.success(`SLA de "${SLA_REPORT_TYPE_LABELS[config.report_type]}" atualizado.`);
    } catch {
      toast.error('Erro ao salvar configuração de SLA.');
    } finally {
      setSaving(null);
    }
  };

  const updateField = (id: string, field: keyof SlaConfig, value: number) => {
    setLocalConfigs(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  if (localConfigs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5" />
          Configuração de SLA dos Relatórios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {localConfigs.map((config) => (
          <div key={config.id} className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-sm">
              {SLA_REPORT_TYPE_LABELS[config.report_type]}
            </h4>

            {/* Prazo padrão */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Prazo padrão: {formatSlaDuration(config.default_days, config.default_hours)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Dias</Label>
                  <Input
                    type="number" min={0} max={90}
                    value={config.default_days}
                    onChange={(e) => updateField(config.id, 'default_days', +e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Horas</Label>
                  <Input
                    type="number" min={0} max={23}
                    value={config.default_hours}
                    onChange={(e) => updateField(config.id, 'default_hours', +e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Alerta */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Alerta (antes do vencimento): {formatSlaDuration(config.warning_days, config.warning_hours)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Dias</Label>
                  <Input
                    type="number" min={0} max={90}
                    value={config.warning_days}
                    onChange={(e) => updateField(config.id, 'warning_days', +e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Horas</Label>
                  <Input
                    type="number" min={0} max={23}
                    value={config.warning_hours}
                    onChange={(e) => updateField(config.id, 'warning_hours', +e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bloqueio */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Bloqueio (após vencimento): {formatSlaDuration(config.escalation_days, config.escalation_hours)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Dias</Label>
                  <Input
                    type="number" min={0} max={30}
                    value={config.escalation_days}
                    onChange={(e) => updateField(config.id, 'escalation_days', +e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Horas</Label>
                  <Input
                    type="number" min={0} max={23}
                    value={config.escalation_hours}
                    onChange={(e) => updateField(config.id, 'escalation_hours', +e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleSave(config)}
              disabled={saving === config.id}
            >
              {saving === config.id ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          O prazo é calculado automaticamente a partir da criação do relatório. Configure dias e horas para controle granular. O status é atualizado automaticamente pelo sistema.
        </p>
      </CardContent>
    </Card>
  );
};
