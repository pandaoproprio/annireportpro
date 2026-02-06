
-- Create storage bucket for team report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-report-photos', 'team-report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload team report photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-report-photos' AND auth.uid() IS NOT NULL);

-- Allow anyone to view team report photos (public bucket)
CREATE POLICY "Team report photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-report-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own team report photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
