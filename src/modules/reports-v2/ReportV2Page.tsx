import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/contexts/AppDataContext';
import { Eye, FileEdit, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportV2Data } from './types';
import { DEFAULT_HEADER } from './types';
import ReportForm from './ReportForm';
import ReportPreview from './ReportPreview';
import { generatePdf } from './pdfGenerator';

type Mode = 'edit' | 'preview';

const ReportV2Page: React.FC = () => {
  const { activeProject, activeProjectId } = useAppData();
  const [mode, setMode] = useState<Mode>('edit');
  const [generating, setGenerating] = useState(false);

  const [data, setData] = useState<ReportV2Data>({
    title: '',
    object: '',
    summary: '',
    sections: [],
    header: DEFAULT_HEADER,
  });

  // Pre-fill from active project
  useEffect(() => {
    if (activeProject) {
      setData((prev) => ({
        ...prev,
        title: prev.title || activeProject.name || '',
        object: prev.object || activeProject.object || '',
      }));
    }
  }, [activeProject]);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const filename = `${data.title || 'relatorio'}.pdf`.replace(/\s+/g, '_');
      await generatePdf(filename);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Relatório V2</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('edit')}
          >
            <FileEdit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button
            variant={mode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            <Eye className="w-4 h-4 mr-2" /> Visualizar
          </Button>
          {mode === 'preview' && (
            <Button size="sm" onClick={handleGeneratePdf} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Gerar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {mode === 'edit' ? (
        <ReportForm data={data} onChange={setData} projectId={activeProjectId} />
      ) : (
        <ReportPreview data={data} />
      )}
    </div>
  );
};

export default ReportV2Page;
