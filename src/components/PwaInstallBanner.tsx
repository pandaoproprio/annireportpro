import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'gira-pwa-banner-dismissed';

export const PwaInstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3 animate-slideDown mb-4">
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <Download className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Instale o Diário de Bordo</p>
        <p className="text-xs text-muted-foreground">Acesse mais rápido direto da tela inicial do seu celular.</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link to="/instalar">
          <Button size="sm" variant="default" className="text-xs h-8">
            Ver como
          </Button>
        </Link>
        <button onClick={dismiss} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
