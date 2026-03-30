import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/imageCompression';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

const BUCKET = 'team-report-photos';

export const EventCoverUpload: React.FC<Props> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são permitidas'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `events/covers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, { contentType: compressed.type });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Imagem de capa enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        const url = new URL(value);
        const parts = url.pathname.split('/');
        const filePath = parts.slice(parts.indexOf('events')).join('/');
        await supabase.storage.from(BUCKET).remove([filePath]);
      } catch { /* best-effort */ }
    }
    onChange(null);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

      {uploading ? (
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : value ? (
        <div className="relative group">
          <img src={value} alt="Capa" className="w-full h-40 object-cover rounded-lg" />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button type="button" size="icon" variant="secondary" className="h-7 w-7" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={handleRemove}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center h-28 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <span className="text-sm text-muted-foreground">Adicionar imagem de capa</span>
          <span className="text-xs text-muted-foreground/60">PNG, JPG, WEBP (máx. 5MB)</span>
        </button>
      )}
    </div>
  );
};
