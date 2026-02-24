import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Eye, Printer, Download, Loader2, FileText, PenTool } from 'lucide-react';

interface Props {
  mode: 'edit' | 'preview';
  setMode: (m: 'edit' | 'preview') => void;
  isExporting: boolean;
  exportType: 'pdf' | 'docx' | null;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onOpenWysiwyg?: () => void;
}

export const ReportToolbar: React.FC<Props> = ({ mode, setMode, isExporting, exportType, onExportPdf, onExportDocx, onOpenWysiwyg }) => (
  <div className="flex justify-between items-center no-print bg-card p-4 shadow-sm rounded-lg sticky top-0 z-10 border-b">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Gerador de Relatório</h2>
      <p className="text-muted-foreground text-sm">Configure e preencha o relatório de prestação de contas.</p>
    </div>
    <div className="flex space-x-2">
      {onOpenWysiwyg && (
        <Button variant="outline" onClick={onOpenWysiwyg} className="border-primary/30 text-primary hover:bg-primary/5">
          <PenTool className="w-4 h-4 mr-2" /> Editor WYSIWYG
        </Button>
      )}
      <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode('edit')}>
        <Edit className="w-4 h-4 mr-2" /> Editar
      </Button>
      <Button variant={mode === 'preview' ? 'default' : 'outline'} onClick={() => setMode('preview')}>
        <Eye className="w-4 h-4 mr-2" /> Visualizar
      </Button>
      {mode === 'preview' && (
        <>
          <Button onClick={() => window.print()} className="animate-scaleIn">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
          <Button onClick={onExportPdf} disabled={isExporting} className="animate-scaleIn bg-primary">
            {isExporting && exportType === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isExporting && exportType === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
          </Button>
          <Button onClick={onExportDocx} disabled={isExporting} variant="outline" className="animate-scaleIn">
            {isExporting && exportType === 'docx' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {isExporting && exportType === 'docx' ? 'Exportando...' : 'Exportar DOCX'}
          </Button>
        </>
      )}
    </div>
  </div>
);
