import React, { useState, useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Loader2, Eye, Edit, Image, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AVAILABLE_SECTIONS, type ReportObjIISection, type ReportObjIIData } from './types';
import { exportReportObjIIPdf } from './pdfExport';
import { useReportVisualConfig } from '@/hooks/useReportVisualConfig';

const ReportObjetoIIPage: React.FC = () => {
  const { activeProject: project } = useAppData();
  const { config: visualConfig } = useReportVisualConfig(project?.id, 'report_object');

  const [title, setTitle] = useState('RELATÓRIO DO OBJETO');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isExporting, setIsExporting] = useState(false);

  const [sections, setSections] = useState<ReportObjIISection[]>(
    AVAILABLE_SECTIONS.map(s => ({
      ...s,
      enabled: true,
      content: '',
      photos: [],
    }))
  );

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const updateContent = (id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const addPhoto = (id: string, url: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, photos: [...s.photos, url] } : s));
  };

  const removePhoto = (id: string, index: number) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, photos: s.photos.filter((_, i) => i !== index) } : s));
  };

  const handlePhotoUpload = async (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) addPhoto(sectionId, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const enabledSections = useMemo(() => sections.filter(s => s.enabled), [sections]);

  const handleExportPdf = async () => {
    if (!project) {
      toast.error('Selecione um projeto primeiro.');
      return;
    }

    const hasContent = sections.some(s => s.enabled && s.content.trim());
    if (!hasContent) {
      toast.error('Preencha pelo menos uma seção antes de exportar.');
      return;
    }

    setIsExporting(true);
    try {
      const data: ReportObjIIData = {
        title,
        logoLeft: visualConfig?.logo || '',
        logoCenter: visualConfig?.logoCenter || '',
        logoRight: visualConfig?.logoSecondary || '',
        sections,
        projectName: project.name,
        projectPeriod: project.startDate && project.endDate
          ? `${new Date(project.startDate).toLocaleDateString('pt-BR')} a ${new Date(project.endDate).toLocaleDateString('pt-BR')}`
          : '',
      };
      await exportReportObjIIPdf(data);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-card p-4 shadow-sm rounded-lg sticky top-0 z-10 border-b">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatório do Objeto II</h2>
          <p className="text-muted-foreground text-sm">Geração client-side com jsPDF — selecione as seções desejadas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode('edit')}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button variant={mode === 'preview' ? 'default' : 'outline'} onClick={() => setMode('preview')}>
            <Eye className="w-4 h-4 mr-2" /> Visualizar
          </Button>
          <Button onClick={handleExportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Seções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.map(section => (
                <div key={section.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`chk-${section.id}`}
                    checked={section.enabled}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <Label htmlFor={`chk-${section.id}`} className="text-sm cursor-pointer">
                    {section.title}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section editors */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <Label className="text-sm font-medium">Título do Relatório</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
              </CardContent>
            </Card>

            {enabledSections.map(section => (
              <Card key={section.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={section.content}
                    onChange={e => updateContent(section.id, e.target.value)}
                    placeholder={`Conteúdo da seção "${section.title}"...`}
                    rows={5}
                  />

                  {/* Photo upload */}
                  <div>
                    <Label className="text-sm flex items-center gap-1 mb-2">
                      <Image className="w-4 h-4" /> Fotos
                    </Label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => handlePhotoUpload(section.id, e)}
                      className="text-sm"
                    />
                    {section.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {section.photos.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img src={url} alt="" className="w-full h-20 object-cover rounded border" />
                            <button
                              onClick={() => removePhoto(section.id, idx)}
                              className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Preview mode */
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-6" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <h1 className="text-2xl font-bold text-center uppercase">{title}</h1>
            {project && <p className="text-center text-muted-foreground">{project.name}</p>}

            {enabledSections.map((section, i) => (
              <div key={section.id} className="space-y-2">
                <h2 className="text-base font-bold uppercase">{`${i + 1}. ${section.title}`}</h2>
                <p className="text-sm text-justify leading-relaxed whitespace-pre-wrap" style={{ textIndent: '1.25cm' }}>
                  {section.content || <span className="text-muted-foreground italic">Sem conteúdo</span>}
                </p>
                {section.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {section.photos.map((url, idx) => (
                      <img key={idx} src={url} alt="" className="w-full h-32 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportObjetoIIPage;
