-- Add LGPD consent timestamp to profiles
ALTER TABLE public.profiles ADD COLUMN lgpd_consent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;