import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ShortLinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!slug) {
        setError('Link inválido.');
        return;
      }
      const { data, error: dbError } = await (supabase as any)
        .from('short_links')
        .select('original_url')
        .eq('slug', slug)
        .maybeSingle();

      if (dbError || !data?.original_url) {
        setError('Link não encontrado ou expirado.');
        return;
      }

      // Fire-and-forget click counter
      (supabase as any).rpc('increment_short_link_clicks', { _slug: slug }).then(() => {});

      // If same-origin, use SPA navigation; else hard redirect
      try {
        const target = new URL(data.original_url, window.location.origin);
        if (target.origin === window.location.origin) {
          window.location.replace(target.pathname + target.search + target.hash);
        } else {
          window.location.replace(data.original_url);
        }
      } catch {
        window.location.replace(data.original_url);
      }
    };
    run();
  }, [slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      {error ? (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 max-w-md text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="font-semibold text-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">Verifique o link com quem o enviou.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm">Redirecionando…</p>
        </div>
      )}
    </div>
  );
}
