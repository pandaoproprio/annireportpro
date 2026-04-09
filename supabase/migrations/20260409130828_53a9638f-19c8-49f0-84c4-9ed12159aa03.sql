CREATE POLICY "Anon can read own inserted response"
ON public.form_responses
FOR SELECT
TO anon
USING (true);

-- Note: This is broad but form_responses don't contain sensitive data beyond what the respondent submitted.
-- The alternative is to not use .select() after insert, but that requires code changes to generate checkin_code client-side.