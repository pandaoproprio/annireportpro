import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GovApiSource =
  | 'transferegov_especiais'
  | 'transferegov_fundo'
  | 'cgu'
  | 'ibge'
  | 'compras';

interface UseGovApiReturn {
  data: any;
  loading: boolean;
  error: string | null;
  query: (source: GovApiSource, endpoint: string, params?: Record<string, string>) => Promise<any>;
  reset: () => void;
}

export function useGovApi(): UseGovApiReturn {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async (
    source: GovApiSource,
    endpoint: string,
    params?: Record<string, string>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('gov-api-proxy', {
        body: { source, endpoint, params },
      });

      if (fnError) throw new Error(fnError.message);
      if (!result?.success) throw new Error(result?.error || 'Erro desconhecido');

      setData(result.data);
      return result.data;
    } catch (err: any) {
      const msg = err.message || 'Erro ao consultar API';
      setError(msg);
      toast.error('Erro na consulta', { description: msg });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, query, reset };
}
