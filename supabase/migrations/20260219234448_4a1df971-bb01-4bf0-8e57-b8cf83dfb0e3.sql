
-- Step 1: Add 'coordenador' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';
