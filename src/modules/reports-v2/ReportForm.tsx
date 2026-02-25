import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Upload, X, ImagePlus } from 'lucide-react';
import { useFileUploader } from '@/hooks/useFileUploader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReportV2Data, ReportV2Section, ReportV2Header } from './types';

interface ReportFormProps {
  data: ReportV2Data;
  onChange: (data: ReportV2Data) => void;
  projectId: string | undefined;
}

const BUCKET = 'team-report-photos';

const ReportForm: React.FC<ReportFormProps> = ({ data, onChange, projectId }) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { sectionPhotos, setSectionPhotos, handleSectionPhotoUpload, removeSectionPhoto } =
    useFileUploader({ projectId, basePath: `reports/${projectId}/v2` });

  const updateField = <K extends keyof ReportV2Data>(key: K, value: ReportV2Data[K]) => {
    onChange({ ...data, [key]: value });
  };

  const updateHeader = (patch: Partial<ReportV2Header>) => {
    updateField('header', { ...data.header, ...patch });
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: keyof ReportV2Header) => {
    if (!e.target.files?.[0] || !projectId) return;
    const file = e.target.files[0];
    try {
      const id = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'png';
      const path = `reports/${projectId}/v2/logos/${position}_${id}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error('Erro ao enviar logo'); return; }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      updateHeader({ [position]: urlData.publicUrl });
      toast.success('Logo enviado!');
    } catch { toast.error('Erro ao processar logo'); }
    e.target.value = '';
  };

  const removeLogo = (position: keyof ReportV2Header) => {
    updateHeader({ [position]: '' });
  };

  const addSection = () => {
    const newSection: ReportV2Section = { id: crypto.randomUUID(), title: '', content: '', photos: [] };
    updateField('sections', [...data.sections, newSection]);
  };

  const updateSection = (index: number, patch: Partial<ReportV2Section>) => {
    const updated = data.sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateField('sections', updated);
  };

  const removeSection = (index: number) => {
    updateField('sections', data.sections.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionId: string, sectionIndex: number) => {
    await handleSectionPhotoUpload(e, sectionId);
    setTimeout(() => {
      setSectionPhotos((prev) => {
        const photos = prev[sectionId] || [];
        updateSection(sectionIndex, { photos });
        return prev;
      });
    }, 100);
  };

  const handleRemovePhoto = async (sectionId: string, photoIndex: number, sectionIndex: number) => {
    await removeSectionPhoto(sectionId, photoIndex);
    setTimeout(() => {
      setSectionPhotos((prev) => {
        const photos = prev[sectionId] || [];
        updateSection(sectionIndex, { photos });
        return prev;
      });
    }, 100);
  };

  const getPhotos = (section: ReportV2Section): string[] => {
    return sectionPhotos[section.id] || section.photos;
  };

  const logoPositions: { key: keyof ReportV2Header; label: string }[] = [
    { key: 'logoLeft', label: 'Logo Esquerda' },
    { key: 'logoCenter', label: 'Logo Central' },
    { key: 'logoRight', label: 'Logo Direita' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho — Logos */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <Label className="text-base font-semibold">Cabeçalho — Logos da Organização</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {logoPositions.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm text-muted-foreground">{label}</Label>
                {data.header[key] ? (
                  <div className="relative group">
                    <img
                      src={data.header[key]}
                      alt={label}
                      className="h-16 object-contain rounded border border-border p-1 bg-white w-full"
                    />
                    <button
                      onClick={() => removeLogo(key)}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => logoInputRefs.current[key]?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" /> Enviar
                  </Button>
                )}
                <input
                  ref={(el) => { logoInputRefs.current[key] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e, key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Título */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-semibold">Título do Relatório</Label>
        <Input id="title" value={data.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Ex: Relatório Mensal de Atividades" />
      </div>

      {/* Objeto */}
      <div className="space-y-2">
        <Label htmlFor="object" className="text-base font-semibold">Objeto</Label>
        <Textarea id="object" value={data.object} onChange={(e) => updateField('object', e.target.value)} placeholder="Descreva o objeto do relatório..." rows={4} />
      </div>

      {/* Resumo */}
      <div className="space-y-2">
        <Label htmlFor="summary" className="text-base font-semibold">Resumo</Label>
        <Textarea id="summary" value={data.summary} onChange={(e) => updateField('summary', e.target.value)} placeholder="Resumo executivo do relatório..." rows={4} />
      </div>

      {/* Seções dinâmicas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Seções</h3>
          <Button variant="outline" size="sm" onClick={addSection}>
            <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Seção
          </Button>
        </div>

        {data.sections.map((section, index) => (
          <Card key={section.id} className="border-border">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Seção {index + 1}</Label>
                <Button variant="ghost" size="icon" onClick={() => removeSection(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <Input value={section.title} onChange={(e) => updateSection(index, { title: e.target.value })} placeholder="Título da seção" />
              <Textarea value={section.content} onChange={(e) => updateSection(index, { content: e.target.value })} placeholder="Conteúdo da seção..." rows={4} />

              {/* Upload de fotos */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[section.id]?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Enviar Fotos
                  </Button>
                  <input
                    ref={(el) => { fileInputRefs.current[section.id] = el; }}
                    type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handlePhotoUpload(e, section.id, index)}
                  />
                </div>

                {getPhotos(section).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {getPhotos(section).map((url, photoIdx) => (
                      <div key={photoIdx} className="relative group">
                        <img src={url} alt={`Foto ${photoIdx + 1}`} className="rounded-md object-cover h-40 w-full" />
                        <button
                          onClick={() => handleRemovePhoto(section.id, photoIdx, index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
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
  );
};

export default ReportForm;
