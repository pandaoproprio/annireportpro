import React from 'react';
import { ActivityType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Execução de Meta': { bg: 'bg-success/15', text: 'text-success', border: 'border-success/40' },
  'Ocorrência/Imprevisto': { bg: 'bg-destructive/15', text: 'text-destructive', border: 'border-destructive/40' },
  'Divulgação/Mídia': { bg: 'bg-info/15', text: 'text-info', border: 'border-info/40' },
  'Reunião de Equipe': { bg: 'bg-warning/15', text: 'text-warning', border: 'border-warning/40' },
  'Administrativo/Financeiro': { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/40' },
  'Outras Ações': { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

interface KanbanFiltersProps {
  activeTypes: string[];
  onToggleType: (type: string) => void;
  activeAuthor: string | null;
  onSetAuthor: (author: string | null) => void;
  authors: { key: string; name: string }[];
  typeCounts: Record<string, number>;
}

export const KanbanFilters: React.FC<KanbanFiltersProps> = ({
  activeTypes, onToggleType, activeAuthor, onSetAuthor, authors, typeCounts,
}) => {
  const hasFilters = activeTypes.length > 0 || activeAuthor;

  return (
    <div className="flex flex-col gap-3">
      {/* Type filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Tipo:</span>
        {Object.values(ActivityType).map(type => {
          const colors = typeColorMap[type] || typeColorMap['Outras Ações'];
          const isActive = activeTypes.includes(type);
          const count = typeCounts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => onToggleType(type)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer',
                isActive
                  ? `${colors.bg} ${colors.text} ${colors.border} ring-1 ring-offset-1 ring-offset-background`
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted',
                isActive && `ring-current/30`
              )}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', isActive ? colors.bg.replace('/15', '') : 'bg-muted-foreground/30')} />
              {type}
              {count > 0 && (
                <span className={cn('ml-0.5 text-[10px] opacity-70')}>({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Author filter chips */}
      {authors.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Autor:</span>
          {authors.map(author => {
            const isActive = activeAuthor === author.key;
            return (
              <button
                key={author.key}
                onClick={() => onSetAuthor(isActive ? null : author.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer',
                  isActive
                    ? 'bg-accent text-accent-foreground border-accent-foreground/20 ring-1 ring-accent-foreground/20 ring-offset-1 ring-offset-background'
                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                )}
              >
                <User className="w-3 h-3" />
                {author.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Clear all */}
      {hasFilters && (
        <div className="flex">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-muted-foreground px-2"
            onClick={() => {
              activeTypes.forEach(t => onToggleType(t));
              onSetAuthor(null);
            }}
          >
            <X className="w-3 h-3 mr-1" /> Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
};
