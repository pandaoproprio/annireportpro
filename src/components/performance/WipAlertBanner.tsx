import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { SLA_REPORT_TYPE_LABELS } from '@/types/sla';
import type { WipDraft } from '@/hooks/usePerformanceTracking';

interface WipAlertBannerProps {
  wipCount: number;
  wipLimit?: number;
  wipDrafts?: WipDraft[];
  isAdmin?: boolean;
}

function formatAge(createdAt: string): string {
  const hoursAgo = Math.round((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (hoursAgo < 24) return `${hoursAgo}h`;
  return `${Math.floor(hoursAgo / 24)}d ${hoursAgo % 24}h`;
}

function getDraftRoute(draft: WipDraft): string {
  const params = new URLSearchParams({ draftId: draft.id, projectId: draft.project_id });
  if (draft.report_type === 'report_team') return `/team-report?${params}`;
  if (draft.report_type === 'justification') return `/justificativa?${params}`;
  return '/';
}

function DraftItem({ d }: { d: WipDraft }) {
  return (
    <li className="text-xs text-muted-foreground flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block flex-shrink-0" />
      <Link
        to={getDraftRoute(d)}
        className="flex items-center gap-1 font-medium text-primary hover:underline"
      >
        {SLA_REPORT_TYPE_LABELS[d.report_type]}
        <ExternalLink className="w-3 h-3" />
      </Link>
      {d.provider_name && <span>— {d.provider_name}</span>}
      <span className="text-muted-foreground">({formatAge(d.created_at)} atrás)</span>
    </li>
  );
}

export const WipAlertBanner: React.FC<WipAlertBannerProps> = ({ wipCount, wipLimit = 5, wipDrafts = [], isAdmin = false }) => {
  if (wipCount <= wipLimit) return null;

  // For admins, group by user and filter only those over limit
  const groupedByUser = isAdmin
    ? wipDrafts.reduce<Record<string, { name: string; drafts: WipDraft[] }>>((acc, d) => {
        const key = d.user_id;
        if (!acc[key]) acc[key] = { name: d.user_name || 'Desconhecido', drafts: [] };
        acc[key].drafts.push(d);
        return acc;
      }, {})
    : null;

  const usersOverLimit = groupedByUser
    ? Object.entries(groupedByUser).filter(([, v]) => v.drafts.length > wipLimit)
    : [];

  if (isAdmin && usersOverLimit.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-foreground border-warning/40">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning" />
        <div className="text-sm">
          {isAdmin ? (
            <>
              <span className="font-semibold">Alerta de WIP:</span>{' '}
              <span className="font-bold">{usersOverLimit.length}</span> colaborador(es) excede(m) o limite de {wipLimit} rascunhos.
            </>
          ) : (
            <>
              <span className="font-semibold">Alerta de WIP:</span> Você possui{' '}
              <span className="font-bold">{wipCount}</span> rascunhos em aberto (limite: {wipLimit}). Considere finalizar alguns antes de criar novos.
            </>
          )}
        </div>
      </div>

      {isAdmin ? (
        <div className="ml-8 space-y-3">
          {usersOverLimit.map(([userId, { name, drafts }]) => (
            <div key={userId}>
              <p className="text-sm font-semibold text-foreground">
                {name} <span className="text-muted-foreground font-normal">— {drafts.length} rascunhos</span>
              </p>
              <ul className="mt-1 space-y-0.5">
                {drafts.map(d => <DraftItem key={d.id} d={d} />)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        wipDrafts.length > 0 && (
          <ul className="ml-8 space-y-1">
            {wipDrafts.map(d => <DraftItem key={d.id} d={d} />)}
          </ul>
        )
      )}
    </div>
  );
};
