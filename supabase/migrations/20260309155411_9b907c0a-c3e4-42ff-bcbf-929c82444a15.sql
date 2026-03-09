
-- Add public_slug column to forms table
ALTER TABLE public.forms ADD COLUMN public_slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_forms_public_slug ON public.forms (public_slug) WHERE public_slug IS NOT NULL;

-- Backfill existing forms with a slug derived from their id (first 8 chars)
UPDATE public.forms SET public_slug = LEFT(id::text, 8) WHERE public_slug IS NULL;
