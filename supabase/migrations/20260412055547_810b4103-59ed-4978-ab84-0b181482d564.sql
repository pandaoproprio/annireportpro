
-- Add notify_mode column to form_digest_config
ALTER TABLE public.form_digest_config
ADD COLUMN notify_mode text NOT NULL DEFAULT 'digest';

-- Update this specific form to per_submission mode and deactivate digest
UPDATE public.form_digest_config
SET notify_mode = 'per_submission', is_active = false
WHERE form_id = '96d87d09-4ea3-4eb6-9506-7f1f6e5435c1';
