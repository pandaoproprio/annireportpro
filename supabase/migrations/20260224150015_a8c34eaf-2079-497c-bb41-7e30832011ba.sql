
-- Create documents table
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Documento sem título',
  content jsonb NOT NULL DEFAULT '{"pages":[{"header":null,"footer":null,"blocks":[]}],"globalHeader":{},"globalFooter":{},"layout":{"marginTop":40,"marginBottom":40,"marginLeft":32,"marginRight":32,"headerSpacing":24,"footerSpacing":24}}'::jsonb,
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create document_versions table
CREATE TABLE public.document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  content_snapshot jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Documents RLS: access via project ownership/collaboration/admin
CREATE POLICY "Users can view documents of their projects"
  ON public.documents FOR SELECT
  USING (
    is_project_owner(auth.uid(), project_id)
    OR is_project_collaborator(auth.uid(), project_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can create documents in their projects"
  ON public.documents FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      is_project_owner(auth.uid(), project_id)
      OR is_project_collaborator(auth.uid(), project_id)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

CREATE POLICY "Users can update documents of their projects"
  ON public.documents FOR UPDATE
  USING (
    is_project_owner(auth.uid(), project_id)
    OR auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can delete documents of their projects"
  ON public.documents FOR DELETE
  USING (
    is_project_owner(auth.uid(), project_id)
    OR auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Document versions RLS: inherit from parent document
CREATE POLICY "Users can view versions of accessible documents"
  ON public.document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND (
        is_project_owner(auth.uid(), d.project_id)
        OR is_project_collaborator(auth.uid(), d.project_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  );

CREATE POLICY "Users can create versions of accessible documents"
  ON public.document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
      AND (
        is_project_owner(auth.uid(), d.project_id)
        OR is_project_collaborator(auth.uid(), d.project_id)
        OR d.created_by = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for document images
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-images', 'document-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload document images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'document-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view document images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'document-images');

CREATE POLICY "Users can update their document images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'document-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their document images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'document-images' AND auth.role() = 'authenticated');
