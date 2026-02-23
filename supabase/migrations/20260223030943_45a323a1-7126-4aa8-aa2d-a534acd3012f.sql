
-- Add attachment_files jsonb column to store uploaded file references
ALTER TABLE public.justification_reports 
ADD COLUMN attachment_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- This stores an array of objects: [{name: "file.pdf", url: "https://..."}]
