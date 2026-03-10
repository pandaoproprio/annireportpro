import React, { useState, useEffect } from 'react';
import { Activity } from '@/types';
import { useActivityNarratives, type ActivityNarrative } from '@/hooks/useActivityNarratives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sparkles, Check, X, RefreshCw, FileText, Edit3, Save, ChevronDown, ChevronUp,
} from 'lucide-react';

interface ActivityNarrativePanelProps {
  activity: Activity;
  projectId: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-warning/10 text-warning border-warning/30' },
  aprovado: { label: 'Aprovado', className: 'bg-success/10 text-success border-success/30' },
  rejeitado: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const AVAILABLE_TARGETS = [
  { key: 'report_object', label: 'Relatório do Objeto' },
  { key: 'report_team', label: 'Relatório da Equipe' },
  { key: 'justification', label: 'Justificativa' },
  { key: 'institutional', label: 'Relatório Institucional' },
  { key: 'accountability', label: 'Prestação de Contas' },
];

export const ActivityNarrativePanel: React.FC<ActivityNarrativePanelProps> = ({ activity, projectId }) => {
  const { narrativeForActivity, generateNarrative, updateNarrative, approveNarrative, rejectNarrative } = useActivityNarratives(projectId);
  const narrative = narrativeForActivity(activity.id);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (narrative) {
      setEditText(narrative.narrative_text);
      setSelectedTargets(narrative.target_reports);
    }
  }, [narrative]);

  const handleGenerate = () => {
    generateNarrative.mutate(activity.id);
  };

  const handleSave = () => {
    if (!narrative) return;
    updateNarrative.mutate({
      id: narrative.id,
      text: editText,
      targetReports: selectedTargets,
    });
    setIsEditing(false);
  };

  const handleApprove = () => {
    if (!narrative) return;
    approveNarrative.mutate(narrative.id);
  };

  const handleReject = () => {
    if (!narrative) return;
    rejectNarrative.mutate(narrative.id);
  };

  const toggleTarget = (key: string) => {
    setSelectedTargets(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // No narrative yet
  if (!narrative) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Narrativa institucional não gerada</span>
          </div>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generateNarrative.isPending}
            className="gap-1.5"
          >
            {generateNarrative.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {generateNarrative.isPending ? 'Gerando...' : 'Gerar Narrativa'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusStyle = STATUS_STYLES[narrative.status] || STATUS_STYLES.rascunho;

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Narrativa Institucional CEAP
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusStyle.className}>
              {statusStyle.label}
            </Badge>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Narrative text */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[200px] text-sm leading-relaxed"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="gap-1">
                  <Save className="w-3.5 h-3.5" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditText(narrative.narrative_text); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm text-foreground/90 leading-relaxed bg-muted/30 rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setIsEditing(true)}
              title="Clique para editar"
            >
              {narrative.narrative_text}
            </div>
          )}

          {/* Target reports selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Utilizar em:</p>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_TARGETS.map(target => (
                <label key={target.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={selectedTargets.includes(target.key)}
                    onCheckedChange={() => {
                      toggleTarget(target.key);
                      if (narrative) {
                        const newTargets = selectedTargets.includes(target.key)
                          ? selectedTargets.filter(k => k !== target.key)
                          : [...selectedTargets, target.key];
                        updateNarrative.mutate({ id: narrative.id, text: narrative.narrative_text, targetReports: newTargets });
                      }
                    }}
                  />
                  {target.label}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {narrative.status !== 'aprovado' && (
              <Button size="sm" variant="outline" onClick={handleApprove} className="gap-1 text-success border-success/30 hover:bg-success/10">
                <Check className="w-3.5 h-3.5" /> Aprovar
              </Button>
            )}
            {narrative.status !== 'rejeitado' && (
              <Button size="sm" variant="outline" onClick={handleReject} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                <X className="w-3.5 h-3.5" /> Rejeitar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGenerate}
              disabled={generateNarrative.isPending}
              className="gap-1 ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generateNarrative.isPending ? 'animate-spin' : ''}`} />
              Regenerar
            </Button>
          </div>

          {/* Meta info */}
          <p className="text-[10px] text-muted-foreground">
            Gerada em {new Date(narrative.created_at).toLocaleString('pt-BR')}
            {narrative.ai_model && ` · Modelo: ${narrative.ai_model}`}
            {narrative.edited_at && ` · Editada em ${new Date(narrative.edited_at).toLocaleString('pt-BR')}`}
          </p>
        </CardContent>
      )}
    </Card>
  );
};
