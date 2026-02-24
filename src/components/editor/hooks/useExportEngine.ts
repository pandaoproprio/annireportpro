import { useCallback } from 'react';
import { DocumentModel } from '@/types/document';
import { toast } from 'sonner';

/**
 * Export engine stub — Phase 3 will implement full @react-pdf/renderer + DOCX export.
 * For now, provides the interface and a placeholder.
 */
export const useExportEngine = (model: DocumentModel, title: string) => {
  const exportPdf = useCallback(async () => {
    toast.info('Exportação PDF será implementada na Fase 3');
    // Phase 3: Use @react-pdf/renderer to generate PDF from model
  }, [model, title]);

  const exportDocx = useCallback(async () => {
    toast.info('Exportação DOCX será implementada na Fase 3');
    // Phase 3: Use docx library to generate DOCX from model
  }, [model, title]);

  return { exportPdf, exportDocx };
};
