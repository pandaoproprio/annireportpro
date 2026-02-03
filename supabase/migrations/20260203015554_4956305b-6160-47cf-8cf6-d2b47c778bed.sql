-- Add custom titles and additional sections support to team_reports
ALTER TABLE public.team_reports 
ADD COLUMN IF NOT EXISTS report_title TEXT DEFAULT 'RELATÓRIO DA EQUIPE DE TRABALHO',
ADD COLUMN IF NOT EXISTS execution_report_title TEXT DEFAULT '2. Relato de Execução da Coordenação do Projeto',
ADD COLUMN IF NOT EXISTS attachments_title TEXT DEFAULT '3. Anexos de Comprovação',
ADD COLUMN IF NOT EXISTS additional_sections JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.team_reports.report_title IS 'Custom main title for the report';
COMMENT ON COLUMN public.team_reports.execution_report_title IS 'Custom title for section 2';
COMMENT ON COLUMN public.team_reports.attachments_title IS 'Custom title for section 3';
COMMENT ON COLUMN public.team_reports.additional_sections IS 'Array of additional sections with title and content';