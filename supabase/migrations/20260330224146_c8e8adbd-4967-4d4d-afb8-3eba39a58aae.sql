INSERT INTO public.short_links (slug, original_url, created_by)
SELECT 'jpa', 'https://relatorios.giraerp.com.br/f/jpa-afro-cultural-oficinas', id
FROM auth.users LIMIT 1;