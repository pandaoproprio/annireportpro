import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PROBABILITY_LABELS, IMPACT_LABELS, STATUS_LABELS, CATEGORY_LABELS, calculateEMV } from '@/hooks/useProjectRisks';
import { AlertTriangle, DollarSign, User, Calendar, Target, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface RiskItem {
  id?: string;
  probability: string;
  impact: string;
  status: string;
  title: string;
  description?: string;
  category?: string;
  responsible?: string | null;
  risk_owner?: string | null;
  due_date?: string | null;
  monetary_impact?: number;
  escalated_to?: string | null;
  project_name?: string;
  mitigation_plan?: string;
}

interface RiskMatrixProps {
  risks: RiskItem[];
  onRiskClick?: (risk: RiskItem) => void;
}

const PROB_ORDER = ['muito_alta', 'alta', 'media', 'baixa', 'muito_baixa'];
const PROB_LABELS_LIST = ['Muito Alta', 'Alta', 'Média', 'Baixa', 'Muito Baixa'];
const IMP_ORDER = ['insignificante', 'menor', 'moderado', 'maior', 'catastrofico'];
const IMP_LABELS_LIST = ['Insignificante', 'Menor', 'Moderado', 'Maior', 'Catastrófico'];

const PROB_SCORE = [5, 4, 3, 2, 1];
const IMP_SCORE = [1, 2, 3, 4, 5];

function getCellColor(probIdx: number, impIdx: number) {
  const score = PROB_SCORE[probIdx] * IMP_SCORE[impIdx];
  if (score >= 15) return 'bg-destructive/20 border-destructive/30 hover:bg-destructive/30';
  if (score >= 9) return 'bg-orange-100 dark:bg-orange-500/10 border-orange-300 hover:bg-orange-200 dark:hover:bg-orange-500/20';
  if (score >= 4) return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-500/20';
  return 'bg-green-50 dark:bg-green-500/10 border-green-300 hover:bg-green-100 dark:hover:bg-green-500/20';
}

function getCellLevel(probIdx: number, impIdx: number) {
  const score = PROB_SCORE[probIdx] * IMP_SCORE[impIdx];
  if (score >= 15) return { label: 'Crítico', color: 'text-destructive' };
  if (score >= 9) return { label: 'Alto', color: 'text-orange-600' };
  if (score >= 4) return { label: 'Médio', color: 'text-yellow-600' };
  return { label: 'Baixo', color: 'text-green-600' };
}

const CellPopover: React.FC<{ cellRisks: RiskItem[]; probIdx: number; impIdx: number; onRiskClick?: (r: RiskItem) => void }> = ({ cellRisks, probIdx, impIdx, onRiskClick }) => {
  const level = getCellLevel(probIdx, impIdx);
  const score = PROB_SCORE[probIdx] * IMP_SCORE[impIdx];
  const totalEMV = cellRisks.reduce((sum, r) => sum + calculateEMV(r.probability, r.monetary_impact || 0), 0);
  const categories = [...new Set(cellRisks.map(r => r.category).filter(Boolean))];
  const projects = [...new Set(cellRisks.map(r => r.project_name).filter(Boolean))];
  const escalated = cellRisks.filter(r => r.escalated_to);
  const overdue = cellRisks.filter(r => r.due_date && new Date(r.due_date) < new Date() && r.status !== 'resolvido');

  return (
    <div className="max-w-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-sm ${level.color}`}>{level.label}</span>
          <Badge variant="outline" className="text-[10px]">Score: {score}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{cellRisks.length} risco(s)</span>
      </div>

      {/* EMV */}
      {totalEMV > 0 && (
        <div className="flex items-center gap-1.5 text-xs bg-primary/5 rounded p-1.5">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="font-medium">EMV Total: R$ {totalEMV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {/* Alerts */}
      {(escalated.length > 0 || overdue.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {escalated.length > 0 && (
            <Badge variant="default" className="bg-orange-500 text-white text-[10px]">
              <ArrowUpCircle className="w-3 h-3 mr-1" />{escalated.length} escalado(s)
            </Badge>
          )}
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <Calendar className="w-3 h-3 mr-1" />{overdue.length} atrasado(s)
            </Badge>
          )}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          <span className="font-medium">Projetos:</span> {projects.join(', ')}
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.map(c => (
            <Badge key={c} variant="secondary" className="text-[10px] py-0">
              {CATEGORY_LABELS[c!] || c}
            </Badge>
          ))}
        </div>
      )}

      {/* Risk list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {cellRisks.map((risk, i) => {
          const isOverdue = risk.due_date && new Date(risk.due_date) < new Date() && risk.status !== 'resolvido';
          const emv = calculateEMV(risk.probability, risk.monetary_impact || 0);
          return (
            <div
              key={risk.id || i}
              className={`text-xs border rounded p-2 space-y-0.5 ${onRiskClick ? 'cursor-pointer hover:bg-accent/50' : ''} ${isOverdue ? 'border-destructive/40' : ''}`}
              onClick={() => onRiskClick?.(risk)}
            >
              <div className="font-medium flex items-center gap-1">
                {risk.title}
                {isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
              </div>
              {risk.project_name && (
                <div className="text-[10px] text-primary/70">📁 {risk.project_name}</div>
              )}
              <div className="flex flex-wrap gap-2 text-muted-foreground text-[10px]">
                {risk.category && <span>{CATEGORY_LABELS[risk.category] || risk.category}</span>}
                {risk.responsible && <span><User className="w-2.5 h-2.5 inline" /> {risk.responsible}</span>}
                {risk.risk_owner && <span className="text-primary">👤 {risk.risk_owner}</span>}
                {emv > 0 && <span className="font-medium">R$ {emv.toLocaleString('pt-BR')}</span>}
                {risk.due_date && (
                  <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                    <Calendar className="w-2.5 h-2.5 inline" /> {format(new Date(risk.due_date), 'dd/MM')}
                  </span>
                )}
                {risk.escalated_to && <span className="text-orange-600">⬆ {risk.escalated_to}</span>}
              </div>
              {risk.mitigation_plan && (
                <div className="text-[10px] text-muted-foreground italic truncate">
                  🛡️ {risk.mitigation_plan.substring(0, 80)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks, onRiskClick }) => {
  const activeRisks = risks.filter(r => r.status !== 'resolvido');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground font-medium">Prob \ Impacto</th>
            {IMP_LABELS_LIST.map((l, i) => (
              <th key={l} className="p-2 text-center text-muted-foreground font-medium min-w-[100px]">
                <div>{l}</div>
                <div className="text-[10px] font-normal opacity-60">×{IMP_SCORE[i]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROB_ORDER.map((prob, pi) => (
            <tr key={prob}>
              <td className="p-2 font-medium text-muted-foreground">
                <div>{PROB_LABELS_LIST[pi]}</div>
                <div className="text-[10px] font-normal opacity-60">×{PROB_SCORE[pi]}</div>
              </td>
              {IMP_ORDER.map((imp, ii) => {
                const cellRisks = activeRisks.filter(r => r.probability === prob && r.impact === imp);
                const score = PROB_SCORE[pi] * IMP_SCORE[ii];
                const cellEMV = cellRisks.reduce((sum, r) => sum + calculateEMV(r.probability, r.monetary_impact || 0), 0);
                const hasEscalated = cellRisks.some(r => r.escalated_to);
                const hasOverdue = cellRisks.some(r => r.due_date && new Date(r.due_date) < new Date() && r.status !== 'resolvido');

                return (
                  <td key={imp} className={`p-1 border rounded ${getCellColor(pi, ii)} text-center transition-colors`}>
                    {cellRisks.length > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full min-h-[50px] flex flex-col items-center justify-center gap-0.5 rounded hover:ring-2 hover:ring-primary/30 transition-all p-1">
                            <span className="text-sm font-bold">{cellRisks.length}</span>
                            <span className="text-[9px] text-muted-foreground">({score}pt)</span>
                            {cellEMV > 0 && (
                              <span className="text-[9px] font-medium text-primary truncate max-w-full">
                                R${cellEMV >= 1000 ? `${(cellEMV / 1000).toFixed(0)}k` : cellEMV.toFixed(0)}
                              </span>
                            )}
                            <div className="flex gap-0.5">
                              {hasEscalated && <ArrowUpCircle className="w-2.5 h-2.5 text-orange-500" />}
                              {hasOverdue && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
                            </div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3" side="right" align="start">
                          <CellPopover cellRisks={cellRisks} probIdx={pi} impIdx={ii} onRiskClick={onRiskClick} />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="min-h-[50px] flex flex-col items-center justify-center">
                        <span className="text-muted-foreground/30">—</span>
                        <span className="text-[9px] text-muted-foreground/30">({score}pt)</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-foreground items-center justify-end">
        <span className="font-medium">Legenda:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30 inline-block" /> Crítico (≥15)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300 inline-block" /> Alto (9-14)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-300 inline-block" /> Médio (4-8)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-300 inline-block" /> Baixo (1-3)</span>
        <span className="flex items-center gap-1"><ArrowUpCircle className="w-3 h-3 text-orange-500" /> Escalado</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-destructive" /> Atrasado</span>
      </div>
    </div>
  );
};
