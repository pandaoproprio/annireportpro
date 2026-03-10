import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/contexts/AppDataContext';
import { Eye, FileEdit, Download, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ReportV2Data } from './types';
import { DEFAULT_HEADER } from './types';
import ReportForm from './ReportForm';
import ReportPreview from './ReportPreview';
import { generateReportPdf } from './reportService';

type Mode = 'edit' | 'preview';

const ReportV2Page: React.FC = () => {
  const { activeProject, activeProjectId } = useAppData();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('edit');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [data, setData] = useState<ReportV2Data>({
    title: '',
    object: '',
    summary: '',
    activities: [],
    sections: [],
    header: DEFAULT_HEADER,
    footer: '',
  });

  // Load existing saved report
  useEffect(() => {
    if (!activeProjectId || !user) return;
    (async () => {
      const { data: existing } = await supabase
        .from('project_report_templates')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('report_type', 'v2')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.report_data) {
        const saved = existing.report_data as any;
        setData({
          title: saved.title || '',
          object: saved.object || '',
          summary: saved.summary || '',
          activities: saved.activities || [],
          sections: saved.sections || [],
          header: saved.header || DEFAULT_HEADER,
          footer: saved.footer || '',
        });
        setSavedId(existing.id);
      }
    })();
  }, [activeProjectId, user]);

  // Pre-fill from active project
  useEffect(() => {
    if (activeProject && !savedId) {
      setData((prev) => ({
        ...prev,
        title: prev.title || activeProject.name || '',
        object: prev.object || activeProject.object || '',
      }));
    }
  }, [activeProject, savedId]);

  const handleSave = useCallback(async () => {
    if (!activeProjectId || !user) return;
    setSaving(true);
    try {
      const payload = {
        project_id: activeProjectId,
        report_type: 'v2',
        report_data: data as any,
        created_by: user.id,
      };

      if (savedId) {
        const { error } = await supabase
          .from('project_report_templates')
          .update({ report_data: data as any, updated_at: new Date().toISOString() })
          .eq('id', savedId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('project_report_templates')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setSavedId(inserted.id);
      }
      toast.success('Relatório salvo!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar relatório.');
    } finally {
      setSaving(false);
    }
  }, [data, activeProjectId, user, savedId]);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const blob = await generateReportPdf(data);
      const filename = `${data.title || 'relatorio'}.pdf`.replace(/\s+/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
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
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
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
