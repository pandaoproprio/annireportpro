import React, { useRef, useCallback } from 'react';
import { ImageBlock as ImageBlockType } from '@/types/document';
import { ImageIcon, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageBlockProps {
  block: ImageBlockType;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageBlockType>) => void;
}

export const ImageBlockComponent: React.FC<ImageBlockProps> = ({ block, isActive, onSelect, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 10MB)');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `editor/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('document-images')
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('document-images')
        .getPublicUrl(path);

      // Get natural dimensions
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const displayW = Math.min(140, img.naturalWidth * 0.264); // px to mm approx
        const displayH = displayW / aspect;
        onUpdate({
          src: urlData.publicUrl,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          displayWidth: Math.round(displayW),
          displayHeight: Math.round(displayH),
        });
        setUploading(false);
      };
      img.onerror = () => {
        onUpdate({ src: urlData.publicUrl });
        setUploading(false);
      };
      img.src = urlData.publicUrl;

      toast.success('Imagem enviada com sucesso');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar imagem');
      setUploading(false);
    }
  }, [onUpdate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`relative group transition-all ${isActive ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
        padding: `${block.padding}mm`,
        width: `${block.width}%`,
        textAlign: block.alignment === 'justify' ? 'center' : block.alignment,
      }}
      onClick={onSelect}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
          <span className="text-sm text-muted-foreground">Enviando imagem...</span>
        </div>
      ) : block.src ? (
        <div className="inline-block relative">
          <img
            src={block.src}
            alt={block.caption || 'Imagem do documento'}
            style={{
              width: `${block.displayWidth}mm`,
              height: `${block.displayHeight}mm`,
              objectFit: 'contain',
              border: block.borderWidth > 0 ? `${block.borderWidth}px solid ${block.borderColor}` : 'none',
            }}
            className="max-w-full"
          />
          {block.caption && (
            <p className="text-xs text-muted-foreground italic text-center mt-1">{block.caption}</p>
          )}
          {/* Replace button */}
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-background"
            title="Substituir imagem"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
        >
          <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <span className="text-sm font-medium text-muted-foreground">Clique ou arraste uma imagem</span>
          <span className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WEBP (máx. 10MB)</span>
        </button>
      )}
    </div>
  );
};
