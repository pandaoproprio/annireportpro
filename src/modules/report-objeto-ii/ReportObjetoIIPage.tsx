import React, { useState, useMemo, useCallback } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Download, Loader2, Eye, Edit, Image, Trash2, Import, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  AVAILABLE_SECTIONS,
  DEFAULT_COVER, DEFAULT_HEADER, DEFAULT_FOOTER,
  type ReportObjIISection, type ReportObjIIData,
  type CoverConfig, type HeaderConfig, type FooterConfig, type PhotoWithCaption,
} from './types';
import { generateReport, downloadReport } from '@/lib/pdf/generate';
import { mapObjetoIIToReportData } from '@/lib/pdf/mappers/mapObjetoII';
import { useReportVisualConfig } from '@/hooks/useReportVisualConfig';
import type { ReportData } from '@/types';

function mapReportDataToSections(rd: ReportData, projectObject?: string, projectSummary?: string): ReportObjIISection[] {
  const photoMeta = rd.photoMetadata || {};

  const getPhotosWithCaptions = (key: string, urls: string[]): PhotoWithCaption[] => {
    const metas = photoMeta[key] || [];
    return urls.map((url, i) => ({
      url,
      caption: metas[i]?.caption || '',
    }));
  };

  const goalPhotos: PhotoWithCaption[] = rd.goalPhotos
    ? Object.entries(rd.goalPhotos).flatMap(([goalId, urls]) =>
        getPhotosWithCaptions(`goal_${goalId}`, urls)
      )
    : [];

  const contentMap: Record<string, { content: string; photos: PhotoWithCaption[] }> = {
    object: { content: rd.objectOverride || projectObject || '', photos: [] },
    summary: { content: rd.executiveSummary || projectSummary || '', photos: [] },
    goals: {
      content: rd.goalNarratives ? Object.values(rd.goalNarratives).filter(Boolean).join('\n\n') : '',
      photos: goalPhotos,
    },
    other: {
      content: rd.otherActionsText || '',
      photos: getPhotosWithCaptions('otherActions', rd.otherActionsPhotos || []),
    },
    communication: {
      content: rd.communicationText || '',
      photos: getPhotosWithCaptions('communication', rd.communicationPhotos || []),
    },
    satisfaction: { content: rd.satisfactionText || '', photos: [] },
    future: { content: rd.futureActionsText || '', photos: [] },
    expenses: {
      content: rd.expenses ? rd.expenses.map(e => `${e.itemName}: ${e.description}`).filter(Boolean).join('\n') : '',
      photos: rd.expenses ? rd.expenses.map(e => e.image).filter(Boolean).map((u, i) => ({ url: u!, caption: (photoMeta['expenses'] || [])[i]?.caption || '' })) : [],
    },
    links: {
      content: [
        rd.links?.attendanceList && `Lista de presença: ${rd.links.attendanceList}`,
        rd.links?.registrationList && `Ficha de inscrição: ${rd.links.registrationList}`,
        rd.links?.mediaFolder && `Mídias: ${rd.links.mediaFolder}`,
      ].filter(Boolean).join('\n'),
      photos: [],
    },
  };

  return AVAILABLE_SECTIONS.map(s => ({
    ...s,
    enabled: true,
    content: contentMap[s.key]?.content || '',
    photos: contentMap[s.key]?.photos || [],
  }));
}

const ReportObjetoIIPage: React.FC = () => {
  const { activeProject: project } = useAppData();
  const { config: visualConfig } = useReportVisualConfig(project?.id, 'report_object');

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [activeTab, setActiveTab] = useState('sections');
  const [isExporting, setIsExporting] = useState(false);

  const [cover, setCover] = useState<CoverConfig>({ ...DEFAULT_COVER });
  const [header, setHeader] = useState<HeaderConfig>({ ...DEFAULT_HEADER });
  const [footer, setFooter] = useState<FooterConfig>({ ...DEFAULT_FOOTER });

  const [sections, setSections] = useState<ReportObjIISection[]>(
    AVAILABLE_SECTIONS.map(s => ({ ...s, enabled: true, content: '', photos: [] }))
  );

  const handleImportFromReport = useCallback(() => {
    if (!project) { toast.error('Selecione um projeto primeiro.'); return; }
    const rd = project.reportData;
    if (!rd) { toast.error('Nenhum relatório salvo encontrado para este projeto.'); return; }

    setSections(mapReportDataToSections(rd, project.object, project.summary));

    // Import cover data
    setCover(prev => ({
      ...prev,
      title: rd.coverTitle || visualConfig?.coverTitle || prev.title,
      subtitle: rd.coverSubtitle || visualConfig?.coverSubtitle || '',
      organizationName: project.organizationName || '',
      fomentoNumber: project.fomentoNumber || '',
      period: project.startDate && project.endDate
        ? `${new Date(project.startDate).toLocaleDateString('pt-BR')} a ${new Date(project.endDate).toLocaleDateString('pt-BR')}`
        : '',
    }));

    // Import logos from reportData first, fallback to visualConfig
    setHeader({
      logoLeft: rd.logo || visualConfig?.logo || '',
      logoCenter: rd.logoCenter || visualConfig?.logoCenter || '',
      logoRight: rd.logoSecondary || visualConfig?.logoSecondary || '',
    });

    // Import footer from visualConfig
    if (visualConfig) {
      setFooter({
        enabled: visualConfig.footerInstitutionalEnabled ?? true,
        line1: visualConfig.footerLine1Text || '',
        line2: visualConfig.footerLine2Text || '',
        line3: visualConfig.footerLine3Text || '',
      });
    }

    // Import sections visibility from reportData.sections if available
    if (rd.sections && rd.sections.length > 0) {
      setSections(prev => prev.map(s => {
        const match = rd.sections?.find(rs => rs.key === s.key);
        if (match) return { ...s, enabled: match.isVisible };
        return s;
      }));
    }

    toast.success('Dados importados do Relatório do Objeto!');
  }, [project, visualConfig]);

  const toggleSection = (id: string) => setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const updateContent = (id: string, content: string) => setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));

  const addPhoto = (id: string, photo: PhotoWithCaption) => setSections(prev => prev.map(s => s.id === id ? { ...s, photos: [...s.photos, photo] } : s));
  const removePhoto = (id: string, index: number) => setSections(prev => prev.map(s => s.id === id ? { ...s, photos: s.photos.filter((_, i) => i !== index) } : s));
  const updatePhotoCaption = (sectionId: string, index: number, caption: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, photos: s.photos.map((p, i) => i === index ? { ...p, caption } : p) } : s));
  };

  const handlePhotoUpload = (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) addPhoto(sectionId, { url: reader.result as string, caption: '' }); };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleLogoUpload = (field: keyof HeaderConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (reader.result) setHeader(prev => ({ ...prev, [field]: reader.result as string })); };
    reader.readAsDataURL(file);
  };

  const enabledSections = useMemo(() => sections.filter(s => s.enabled), [sections]);

  const handleExportPdf = async () => {
    if (!project) { toast.error('Selecione um projeto primeiro.'); return; }
    const hasContent = sections.some(s => s.enabled && (s.content.trim() || s.photos.length > 0));
    if (!hasContent) { toast.error('Preencha pelo menos uma seção antes de exportar.'); return; }

    setIsExporting(true);
    try {
      const reportState = { sections, titulo: project.name, organizacao: project.organizationName, periodo: '' };
      const data = mapObjetoIIToReportData(reportState, visualConfig?.logo ?? header.logoCenter ?? undefined);
      const blob = await generateReport(data, 'objeto-ii');
      downloadReport(blob, `relatorio-objeto-ii-${Date.now()}`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateCover = (field: keyof CoverConfig, value: string | boolean) => setCover(prev => ({ ...prev, [field]: value }));

  /** Strip HTML for preview plain rendering */
  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap justify-between items-center bg-card p-4 shadow-sm rounded-lg sticky top-0 z-10 border-b gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatório do Objeto II</h2>
          <p className="text-muted-foreground text-sm">Padrão ABNT · Editor rico · Seções customizáveis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleImportFromReport} className="border-primary/30 text-primary hover:bg-primary/5">
            <Import className="w-4 h-4 mr-2" /> Importar do Relatório
          </Button>
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
          {/* Left panel: sections checklist */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Seções</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {sections.map(section => (
                  <div key={section.id} className="flex items-center gap-2">
                    <Checkbox id={`chk-${section.id}`} checked={section.enabled} onCheckedChange={() => toggleSection(section.id)} />
                    <Label htmlFor={`chk-${section.id}`} className="text-sm cursor-pointer">{section.title}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main panel */}
          <div className="lg:col-span-3 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cover">Capa</TabsTrigger>
                <TabsTrigger value="footer">Rodapé</TabsTrigger>
                <TabsTrigger value="sections">Seções</TabsTrigger>
              </TabsList>

              {/* ── COVER TAB ── */}
              <TabsContent value="cover">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" /> Configuração da Capa</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Título Principal</Label>
                      <Input value={cover.title} onChange={e => updateCover('title', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Subtítulo</Label>
                      <Input value={cover.subtitle} onChange={e => updateCover('subtitle', e.target.value)} className="mt-1" placeholder="Ex: Prestação de Contas Parcial" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Nome da Organização</Label>
                      <Input value={cover.organizationName} onChange={e => updateCover('organizationName', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Número do Fomento / Convênio</Label>
                      <Input value={cover.fomentoNumber} onChange={e => updateCover('fomentoNumber', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Período de Referência</Label>
                      <Input value={cover.period} onChange={e => updateCover('period', e.target.value)} className="mt-1" placeholder="Ex: 01/01/2026 a 30/03/2026" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={cover.showLogos} onCheckedChange={v => updateCover('showLogos', v)} />
                      <Label className="text-sm">Exibir logotipos na capa</Label>
                    </div>

                    {/* Logo bar (inside cover tab) */}
                    <div className="border-t pt-4 mt-4">
                      <Label className="text-sm font-medium mb-3 block">Barra de Logos</Label>
                      <div className="grid grid-cols-3 gap-4">
                        {(['logoLeft', 'logoCenter', 'logoRight'] as const).map(field => (
                          <div key={field} className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {field === 'logoLeft' ? 'Esquerdo' : field === 'logoCenter' ? 'Central' : 'Direito'}
                            </Label>
                            {header[field] ? (
                              <div className="relative">
                                <img src={header[field]} alt="" className="h-14 object-contain border rounded p-1 bg-background" />
                                <button onClick={() => setHeader(p => ({ ...p, [field]: '' }))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="h-14 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                                Sem logo
                              </div>
                            )}
                            <input type="file" accept="image/*" onChange={e => handleLogoUpload(field, e)} className="text-xs w-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── FOOTER TAB ── */}
              <TabsContent value="footer">
                <Card>
                  <CardHeader><CardTitle className="text-base">Rodapé Institucional</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={footer.enabled} onCheckedChange={v => setFooter(p => ({ ...p, enabled: v }))} />
                      <Label className="text-sm">Exibir rodapé institucional</Label>
                    </div>
                    {footer.enabled && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Linha 1 (Nome da Instituição)</Label>
                          <Input value={footer.line1} onChange={e => setFooter(p => ({ ...p, line1: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Linha 2 (Endereço)</Label>
                          <Input value={footer.line2} onChange={e => setFooter(p => ({ ...p, line2: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Linha 3 (Contato)</Label>
                          <Input value={footer.line3} onChange={e => setFooter(p => ({ ...p, line3: e.target.value }))} className="mt-1" />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── SECTIONS TAB (Rich Text Editor) ── */}
              <TabsContent value="sections" className="space-y-4">
                {enabledSections.map(section => (
                  <Card key={section.id}>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <RichTextEditor
                        value={section.content}
                        onChange={val => updateContent(section.id, val)}
                        placeholder={`Escreva o conteúdo de "${section.title}"...`}
                        enableImages
                      />

                      {/* Photo upload with captions */}
                      <div>
                        <Label className="text-sm flex items-center gap-1 mb-2"><Image className="w-4 h-4" /> Registros Fotográficos</Label>
                        <input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(section.id, e)} className="text-sm" />
                        {section.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            {section.photos.map((photo, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="relative group">
                                  <img src={photo.url} alt="" className="w-full h-24 object-cover rounded border" />
                                  <button
                                    onClick={() => removePhoto(section.id, idx)}
                                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <Input
                                  value={photo.caption}
                                  onChange={e => updatePhotoCaption(section.id, idx, e.target.value)}
                                  placeholder="Legenda..."
                                  className="text-xs h-7"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        /* ── PREVIEW ── */
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-6" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {(header.logoLeft || header.logoCenter || header.logoRight) && (
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <div className="flex-1 flex justify-start">{header.logoLeft && <img src={header.logoLeft} alt="" className="h-12 object-contain" />}</div>
                <div className="flex-1 flex justify-center">{header.logoCenter && <img src={header.logoCenter} alt="" className="h-12 object-contain" />}</div>
                <div className="flex-1 flex justify-end">{header.logoRight && <img src={header.logoRight} alt="" className="h-12 object-contain" />}</div>
              </div>
            )}

            <div className="text-center space-y-2 py-8 border-b">
              <h1 className="text-2xl font-bold uppercase">{cover.title}</h1>
              {cover.subtitle && <p className="text-lg">{cover.subtitle}</p>}
              {cover.organizationName && <p className="text-muted-foreground">{cover.organizationName}</p>}
              {cover.fomentoNumber && <p className="text-muted-foreground text-sm">{cover.fomentoNumber}</p>}
              {cover.period && <p className="text-muted-foreground text-sm">{cover.period}</p>}
            </div>

            {enabledSections.map((section, i) => (
              <div key={section.id} className="space-y-2">
                <h2 className="text-base font-bold uppercase">{`${i + 1}. ${section.title}`}</h2>
                {section.content ? (
                  <div
                    className="text-sm text-justify leading-relaxed prose prose-sm max-w-none"
                    style={{ textIndent: '1.25cm' }}
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem conteúdo</p>
                )}
                {section.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {section.photos.map((photo, idx) => (
                      <div key={idx} className="text-center">
                        <img src={photo.url} alt="" className="w-full h-32 object-cover rounded" />
                        {photo.caption && <p className="text-xs text-muted-foreground italic mt-1">{photo.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {footer.enabled && (
              <div className="border-t pt-3 mt-6 text-center text-muted-foreground">
                {footer.line1 && <p className="text-xs font-medium">{footer.line1}</p>}
                {footer.line2 && <p className="text-[10px]">{footer.line2}</p>}
                {footer.line3 && <p className="text-[10px]">{footer.line3}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportObjetoIIPage;
