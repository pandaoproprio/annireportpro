CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  original_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  click_count integer DEFAULT 0
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create short links" ON public.short_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view own short links" ON public.short_links
  FOR SELECT TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Anyone can read by slug" ON public.short_links
  FOR SELECT TO anon USING (true);