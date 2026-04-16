
-- Drop overly permissive SELECT policies on storage.objects for our buckets
-- and replace with scoped ones

-- First, drop existing broad SELECT policies
DROP POLICY IF EXISTS "Public read access for team-report-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view team-report-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read for team-report-photos" ON storage.objects;
DROP POLICY IF EXISTS "team-report-photos are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Public read access for document-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view document-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read for document-images" ON storage.objects;
DROP POLICY IF EXISTS "document-images are publicly accessible" ON storage.objects;

-- Recreate with path-scoped policies (read individual files OK, but no listing)
CREATE POLICY "Authenticated users can read team-report-photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'team-report-photos');

CREATE POLICY "Authenticated users can read document-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'document-images');
