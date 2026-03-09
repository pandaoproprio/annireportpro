
-- Add forms permissions to app_permission enum
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'forms_view';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'forms_create';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'forms_edit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'forms_delete';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'forms_export';
