import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineBadge: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium animate-fadeIn">
      <WifiOff className="w-4 h-4" />
      Offline
    </div>
  );
};
