import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function generateSlug(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const useShortLinks = () => {
  const [shortening, setShortening] = useState(false);

  const shortenUrl = async (originalUrl: string): Promise<string | null> => {
    setShortening(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para encurtar links.');
        return null;
      }

      // Check if already shortened
      const { data: existing } = await (supabase as any)
        .from('short_links')
        .select('slug')
        .eq('original_url', originalUrl)
        .eq('created_by', user.id)
        .maybeSingle();

      if (existing?.slug) {
        const shortUrl = buildShortUrl(existing.slug);
        toast.success('Link já encurtado!');
        return shortUrl;
      }

      const slug = generateSlug(8);
      const { error } = await (supabase as any)
        .from('short_links')
        .insert({ slug, original_url: originalUrl, created_by: user.id });

      if (error) {
        console.error('Error shortening URL:', error);
        toast.error('Erro ao encurtar link.');
        return null;
      }

      const shortUrl = buildShortUrl(slug);
      toast.success('Link encurtado com sucesso!');
      return shortUrl;
    } catch (e) {
      console.error(e);
      toast.error('Erro ao encurtar link.');
      return null;
    } finally {
      setShortening(false);
    }
  };

  return { shortenUrl, shortening };
};

function buildShortUrl(slug: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/short-link-redirect?slug=${slug}`;
}
