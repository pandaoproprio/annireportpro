import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Upload, X, ImagePlus, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReportV2Data, ReportV2Activity, ReportV2Header, MediaItem } from './types';

interface ReportFormProps {
  data: ReportV2Data;
  onChange: (data: ReportV2Data) => void;
  projectId: string | undefined;
}

const BUCKET = 'team-report-photos';

const ReportForm: React.FC<ReportFormProps> = ({ data, onChange, projectId }) => {
  const mediaInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Activities
  const addActivity = () => {
    const activity: ReportV2Activity = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      date: '',
      media: [],
    };
    updateField('activities', [...data.activities, activity]);
  };

  const updateActivity = (index: number, patch: Partial<ReportV2Activity>) => {
    const updated = data.activities.map((a, i) => (i === index ? { ...a, ...patch } : a));
    updateField('activities', updated);
  };

  const removeActivity = (index: number) => {
    updateField('activities', data.activities.filter((_, i) => i !== index));
  };

  // Media upload (image + video)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, activityIndex: number) => {
    if (!e.target.files?.length || !projectId) return;
    const activity = data.activities[activityIndex];
    const newMedia: MediaItem[] = [...activity.media];

    for (const file of Array.from(e.target.files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        toast.error(`Tipo não suportado: ${file.name}`);
        continue;
      }
      try {
        const id = crypto.randomUUID();
        const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const path = `reports/${projectId}/v2/activities/${activity.id}/${id}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error(`Erro ao enviar: ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        newMedia.push({ type: isVideo ? 'video' : 'image', url: urlData.publicUrl });
      } catch { toast.error(`Erro: ${file.name}`); }
    }

    updateActivity(activityIndex, { media: newMedia });
    toast.success('Mídia enviada!');
    e.target.value = '';
  };

  const removeMedia = (activityIndex: number, mediaIndex: number) => {
    const activity = data.activities[activityIndex];
    updateActivity(activityIndex, { media: activity.media.filter((_, i) => i !== mediaIndex) });
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
                    <img src={data.header[key]} alt={label} className="h-16 object-contain rounded border border-border p-1 bg-white w-full" />
                    <button onClick={() => removeLogo(key)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => logoInputRefs.current[key]?.click()}>
                    <ImagePlus className="w-4 h-4 mr-2" /> Enviar
                  </Button>
                )}
                <input ref={(el) => { logoInputRefs.current[key] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, key)} />
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

      {/* Atividades dinâmicas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Atividades</h3>
          <Button variant="outline" size="sm" onClick={addActivity}>
            <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Atividade
          </Button>
        </div>

        {data.activities.map((activity, index) => (
          <Card key={activity.id} className="border-border">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Atividade {index + 1}</Label>
                <Button variant="ghost" size="icon" onClick={() => removeActivity(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <Input value={activity.title} onChange={(e) => updateActivity(index, { title: e.target.value })} placeholder="Título da atividade" />
              <Input type="date" value={activity.date} onChange={(e) => updateActivity(index, { date: e.target.value })} />
              <Textarea value={activity.description} onChange={(e) => updateActivity(index, { description: e.target.value })} placeholder="Descrição da atividade..." rows={4} />

              {/* Upload de mídia */}
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={() => mediaInputRefs.current[activity.id]?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Enviar Fotos/Vídeos
                </Button>
                <input
                  ref={(el) => { mediaInputRefs.current[activity.id] = el; }}
                  type="file" accept="image/*,video/*" multiple className="hidden"
                  onChange={(e) => handleMediaUpload(e, index)}
                />

                {activity.media.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {activity.media.map((item, mIdx) => (
                      <div key={mIdx} className="relative group">
                        {item.type === 'image' ? (
                          <img src={item.url} alt={`Mídia ${mIdx + 1}`} className="rounded-md object-cover h-40 w-full" />
                        ) : (
                          <div className="relative h-40 w-full rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            <video src={item.url} className="absolute inset-0 w-full h-full object-cover" muted />
                            <Play className="w-10 h-10 text-foreground/70 z-10" />
                          </div>
                        )}
                        <button
                          onClick={() => removeMedia(index, mIdx)}
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
