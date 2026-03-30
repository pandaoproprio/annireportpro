import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = Deno.env.get('SITE_URL') || 'https://relatorios.giraerp.com.br';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response('Missing slug', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try slug first, then id
    let query = supabase
      .from('forms')
      .select('id, title, description, settings, status')
      .eq('public_slug', slug)
      .in('status', ['ativo', 'pausado', 'encerrado'])
      .single();

    let { data: form, error } = await query;

    if (error || !form) {
      // Try by id
      const { data: formById } = await supabase
        .from('forms')
        .select('id, title, description, settings, status')
        .eq('id', slug)
        .in('status', ['ativo', 'pausado', 'encerrado'])
        .single();
      form = formById;
    }

    if (!form) {
      return Response.redirect(`${SITE_URL}/f/${slug}`, 302);
    }

    const settings = (form.settings || {}) as Record<string, string>;
    const ogImage = settings.coverImageUrl || settings.headerImageUrl || settings.logoUrl || '';
    const ogTitle = form.title || 'GIRA Forms';
    const ogDescription = (form.description || 'Preencha o formulário').slice(0, 160);
    const canonicalUrl = `${SITE_URL}/f/${slug}`;

    // Check if request is from a social crawler
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|googlebot|bingbot|bot|crawl|spider|preview/i.test(ua);

    if (!isCrawler) {
      // Regular user — redirect to SPA
      return Response.redirect(canonicalUrl, 302);
    }

    // Crawler — serve HTML with OG tags
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}
  <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
  <p>${escapeHtml(ogTitle)}</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    console.error('form-og error:', e);
    return new Response('Internal error', { status: 500 });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
