import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Image, Type, Upload, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormDesignSettings } from '../types';

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'system-ui, sans-serif', label: 'System' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
];

interface Props {
  settings: FormDesignSettings;
  onSave: (settings: FormDesignSettings) => Promise<void>;
}

export const FormDesignEditor: React.FC<Props> = ({ settings: initial, onSave }) => {
  const [s, setS] = useState<FormDesignSettings>({ ...initial });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<FormDesignSettings>) => setS(prev => ({ ...prev, ...patch }));

  const uploadImage = async (file: File, field: 'logoUrl' | 'coverImageUrl' | 'headerImageUrl') => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `form-assets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('document-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('document-images').getPublicUrl(path);
      update({ [field]: data.publicUrl });
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(s);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Palette className="w-4 h-4" /> Cores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Cor principal</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={s.primaryColor || '#2E7D32'} onChange={e => update({ primaryColor: e.target.value })} className="w-10 h-9 rounded cursor-pointer border" />
                <Input value={s.primaryColor || '#2E7D32'} onChange={e => update({ primaryColor: e.target.value })} className="h-9 text-xs font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor dos botões</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={s.buttonColor || '#2E7D32'} onChange={e => update({ buttonColor: e.target.value })} className="w-10 h-9 rounded cursor-pointer border" />
                <Input value={s.buttonColor || '#2E7D32'} onChange={e => update({ buttonColor: e.target.value })} className="h-9 text-xs font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Fundo</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={s.backgroundColor || '#f5f5f5'} onChange={e => update({ backgroundColor: e.target.value })} className="w-10 h-9 rounded cursor-pointer border" />
                <Input value={s.backgroundColor || '#f5f5f5'} onChange={e => update({ backgroundColor: e.target.value })} className="h-9 text-xs font-mono" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Image className="w-4 h-4" /> Imagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['logoUrl', 'coverImageUrl', 'headerImageUrl'] as const).map(field => {
            const labels: Record<string, string> = { logoUrl: 'Logotipo', coverImageUrl: 'Imagem de Capa', headerImageUrl: 'Imagem de Cabeçalho' };
            return (
              <div key={field}>
                <Label className="text-xs">{labels[field]}</Label>
                <div className="flex items-center gap-2 mt-1">
                  {s[field] ? (
                    <img src={s[field]} alt="" className="h-12 rounded border object-contain" />
                  ) : (
                    <div className="h-12 w-20 rounded border-2 border-dashed border-border flex items-center justify-center">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], field)}
                      className="h-9 text-xs"
                    />
                  </div>
                  {s[field] && (
                    <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => update({ [field]: undefined })}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Typography & Layout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Type className="w-4 h-4" /> Tipografia e Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Fonte</Label>
            <Select value={s.fontFamily || 'Inter, sans-serif'} onValueChange={v => update({ fontFamily: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {s.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <Label className="text-xs">Tema escuro</Label>
            </div>
            <Switch checked={s.theme === 'dark'} onCheckedChange={v => update({ theme: v ? 'dark' : 'light' })} />
          </div>
          <div>
            <Label className="text-xs">Layout da página</Label>
            <Select value={s.pageLayout || 'centered'} onValueChange={v => update({ pageLayout: v as 'centered' | 'full' })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="centered">Centralizado</SelectItem>
                <SelectItem value="full">Largura total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Mensagem após envio</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={s.successMessage || ''}
            onChange={e => update({ successMessage: e.target.value })}
            placeholder="Obrigado por preencher o formulário!"
            rows={2}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Salvando...' : 'Salvar Design'}
      </Button>
    </div>
  );
};
