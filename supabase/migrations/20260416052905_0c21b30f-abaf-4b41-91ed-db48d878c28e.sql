
-- Drop the broad authenticated policies and replace with path-scoped
DROP POLICY IF EXISTS "Authenticated users can read team-report-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read document-images" ON storage.objects;

-- Only allow reading specific files (not listing the bucket root)
CREATE POLICY "Read specific team-report-photos files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'team-report-photos'
  AND (storage.foldername(name))[1] IS NOT NULL
);

CREATE POLICY "Read specific document-images files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-images'
  AND (storage.foldername(name))[1] IS NOT NULL
);
