import { useCallback, useState } from 'react';
import { DocumentModel } from '@/types/document';
import { toast } from 'sonner';
import { generatePdf } from '../export/pdfExport';
import { generateDocx } from '../export/docxExport';

export const useExportEngine = (model: DocumentModel, title: string) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      toast.info('Gerando PDF...');
      await generatePdf(model, title);
      toast.success('PDF exportado com sucesso!');
    } catch (e) {
      console.error('PDF export error:', e);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  }, [model, title]);

  const exportDocx = useCallback(async () => {
    setIsExporting(true);
    try {
      toast.info('Gerando DOCX...');
      await generateDocx(model, title);
      toast.success('DOCX exportado com sucesso!');
    } catch (e) {
      console.error('DOCX export error:', e);
      toast.error('Erro ao exportar DOCX');
    } finally {
      setIsExporting(false);
    }
  }, [model, title]);

  return { exportPdf, exportDocx, isExporting };
};
