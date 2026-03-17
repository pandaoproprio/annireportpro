import React from 'react';
import { CollaboratorPresence } from '@/hooks/useRealtimeCollaboration';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Users, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollaborationPresenceBarProps {
  collaborators: CollaboratorPresence[];
  remoteUpdateCount: number;
  onRefresh?: () => void;
}

export const CollaborationPresenceBar: React.FC<CollaborationPresenceBarProps> = ({
  collaborators,
  remoteUpdateCount,
  onRefresh,
}) => {
  if (collaborators.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-accent/50 border border-accent"
      >
        <Users className="w-4 h-4 text-accent-foreground/70 shrink-0" />
        <span className="text-xs text-accent-foreground/70 shrink-0">
          Editando agora:
        </span>

        <TooltipProvider>
          <div className="flex items-center -space-x-2">
            {collaborators.map((c) => (
              <Tooltip key={c.userId}>
                <TooltipTrigger asChild>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background cursor-default"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.userName.charAt(0).toUpperCase()}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-semibold">{c.userName}</p>
                  {c.activeField && (
                    <p className="text-muted-foreground">
                      Editando: {c.activeField}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2 ml-auto">
          {collaborators.map((c) => (
            <span key={c.userId} className="text-xs text-accent-foreground/80">
              {c.userName}
            </span>
          ))}
        </div>

        {remoteUpdateCount > 0 && onRefresh && (
          <Badge
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={onRefresh}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-[10px]">
              {remoteUpdateCount} atualização{remoteUpdateCount > 1 ? 'ões' : ''}
            </span>
          </Badge>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
