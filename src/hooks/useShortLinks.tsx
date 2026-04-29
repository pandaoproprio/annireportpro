import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FRIENDLY_DOMAIN = 'https://relatorios.giraerp.com.br';

function generateSlug(length = 6): string {
  // Friendly: lowercase letters + numbers, no ambiguous chars (0/O/1/l/i)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildShortUrl(slug: string): string {
  return `${FRIENDLY_DOMAIN}/s/${slug}`;
}

export const useShortLinks = () => {
  const [shortening, setShortening] = useState(false);

  const shortenUrl = async (
    originalUrl: string,
    customSlug?: string,
  ): Promise<string | null> => {
    setShortening(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para encurtar links.');
        return null;
      }

      // If user passed a custom slug, sanitize and try to use it
      if (customSlug) {
        const slug = sanitizeSlug(customSlug);
        if (slug.length < 3) {
          toast.error('O nome do link deve ter ao menos 3 caracteres.');
          return null;
        }

        // Check if slug exists
        const { data: existingSlug } = await (supabase as any)
          .from('short_links')
          .select('original_url, created_by')
          .eq('slug', slug)
          .maybeSingle();

        if (existingSlug) {
          if (existingSlug.original_url === originalUrl) {
            toast.success('Link já existe!');
            return buildShortUrl(slug);
          }
          toast.error('Esse nome de link já está em uso. Escolha outro.');
          return null;
        }

        const { error } = await (supabase as any)
          .from('short_links')
          .insert({ slug, original_url: originalUrl, created_by: user.id });

        if (error) {
          console.error('Error creating short link:', error);
          toast.error('Erro ao encurtar link.');
          return null;
        }

        toast.success('Link encurtado!');
        return buildShortUrl(slug);
      }

      // Reuse existing short link by this user for the same URL
      const { data: existing } = await (supabase as any)
        .from('short_links')
        .select('slug')
        .eq('original_url', originalUrl)
        .eq('created_by', user.id)
        .maybeSingle();

      if (existing?.slug) {
        toast.success('Link já encurtado!');
        return buildShortUrl(existing.slug);
      }

      // Try a few random slugs to avoid collisions
      let lastError: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const slug = generateSlug(6);
        const { error } = await (supabase as any)
          .from('short_links')
          .insert({ slug, original_url: originalUrl, created_by: user.id });

        if (!error) {
          toast.success('Link encurtado!');
          return buildShortUrl(slug);
        }
        lastError = error;
        // 23505 = unique violation → try again
        if (!String(error?.code).includes('23505') && !String(error?.message).toLowerCase().includes('duplicate')) {
          break;
        }
      }

      console.error('Error shortening URL:', lastError);
      toast.error('Erro ao encurtar link.');
      return null;
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
