import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getRiskLevel } from '@/hooks/useProjectRisks';

interface RiskMatrixProps {
  risks: Array<{ probability: string; impact: string; status: string; title: string }>;
}

const PROB_ORDER = ['muito_alta', 'alta', 'media', 'baixa', 'muito_baixa'];
const PROB_LABELS = ['Muito Alta', 'Alta', 'Média', 'Baixa', 'Muito Baixa'];
const IMP_ORDER = ['insignificante', 'menor', 'moderado', 'maior', 'catastrofico'];
const IMP_LABELS = ['Insignificante', 'Menor', 'Moderado', 'Maior', 'Catastrófico'];

function getCellColor(prob: number, imp: number) {
  const score = (5 - prob) * (imp + 1); // prob index inverted
  const s = (PROB_ORDER.length - prob) * (imp + 1);
  if (s >= 15) return 'bg-destructive/20 border-destructive/30';
  if (s >= 9) return 'bg-orange-100 dark:bg-orange-500/10 border-orange-300';
  if (s >= 4) return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300';
  return 'bg-green-50 dark:bg-green-500/10 border-green-300';
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks }) => {
  const activeRisks = risks.filter(r => r.status !== 'resolvido');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground font-medium">Prob \ Impacto</th>
            {IMP_LABELS.map(l => (
              <th key={l} className="p-2 text-center text-muted-foreground font-medium min-w-[80px]">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROB_ORDER.map((prob, pi) => (
            <tr key={prob}>
              <td className="p-2 font-medium text-muted-foreground">{PROB_LABELS[pi]}</td>
              {IMP_ORDER.map((imp, ii) => {
                const cellRisks = activeRisks.filter(r => r.probability === prob && r.impact === imp);
                return (
                  <td key={imp} className={`p-2 border rounded ${getCellColor(pi, ii)} text-center`}>
                    {cellRisks.length > 0 ? (
                      <Badge variant="outline" className="text-[10px]">
                        {cellRisks.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
