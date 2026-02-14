import { useState, useEffect } from 'react';

export const useIsStandalone = (): boolean => {
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });

  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isStandalone;
};
