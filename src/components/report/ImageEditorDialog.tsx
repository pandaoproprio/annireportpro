import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Sun, Contrast, Crop, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  projectId: string;
  onSave: (newUrl: string) => void;
}

export const ImageEditorDialog: React.FC<ImageEditorDialogProps> = ({
  open, onOpenChange, imageUrl, projectId, onSave,
}) => {
  const cropperRef = useRef<CropperRef>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'crop' | 'adjust'>('crop');

  const handleRotate = (angle: number) => {
    cropperRef.current?.rotateImage(angle);
  };

  const handleFlip = (horizontal: boolean) => {
    cropperRef.current?.flipImage(horizontal, !horizontal);
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    cropperRef.current?.reset();
  };

  const applyFilters = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    if (brightness === 100 && contrast === 100) return canvas;
    const filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = canvas.width;
    filteredCanvas.height = canvas.height;
    const ctx = filteredCanvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(canvas, 0, 0);
    return filteredCanvas;
  };

  const handleSave = async () => {
    const cropper = cropperRef.current;
    if (!cropper) return;

    setIsSaving(true);
    try {
      const canvas = cropper.getCanvas();
      if (!canvas) {
        toast.error('Erro ao processar imagem');
        return;
      }

      const finalCanvas = applyFilters(canvas);

      const blob = await new Promise<Blob | null>((resolve) =>
        finalCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );

      if (!blob) {
        toast.error('Erro ao gerar imagem');
        return;
      }

      const photoId = crypto.randomUUID();
      const filePath = `reports/${projectId}/edited/${photoId}.jpg`;
      const { error } = await supabase.storage
        .from('team-report-photos')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });

      if (error) {
        toast.error('Erro ao salvar imagem editada');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('team-report-photos')
        .getPublicUrl(filePath);

      onSave(urlData.publicUrl);
      onOpenChange(false);
      toast.success('Imagem editada e salva!');
    } catch {
      toast.error('Erro ao salvar imagem');
    } finally {
      setIsSaving(false);
    }
  };

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Imagem</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          <Button variant={mode === 'crop' ? 'default' : 'outline'} size="sm" onClick={() => setMode('crop')}>
            <Crop className="w-4 h-4 mr-1" /> Recortar
          </Button>
          <Button variant={mode === 'adjust' ? 'default' : 'outline'} size="sm" onClick={() => setMode('adjust')}>
            <Sun className="w-4 h-4 mr-1" /> Ajustar
          </Button>
          <div className="border-l mx-1" />
          <Button variant="outline" size="sm" onClick={() => handleRotate(-90)} title="Girar 90° esquerda">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleRotate(90)} title="Girar 90° direita">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleFlip(true)} title="Espelhar horizontal">
            <FlipHorizontal className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleFlip(false)} title="Espelhar vertical">
            <FlipVertical className="w-4 h-4" />
          </Button>
          <div className="border-l mx-1" />
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Resetar
          </Button>
        </div>

        {/* Cropper */}
        <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: 'min(65vh, 700px)', ...filterStyle }}>
          <Cropper
            ref={cropperRef}
            src={imageUrl}
            className="h-full w-full"
            stencilProps={{ aspectRatio: undefined }}
          />
        </div>

        {/* Adjustments Panel */}
        {mode === 'adjust' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Sun className="w-4 h-4" /> Brilho: {brightness}%
              </Label>
              <Slider
                value={[brightness]}
                onValueChange={([v]) => setBrightness(v)}
                min={50}
                max={200}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Contrast className="w-4 h-4" /> Contraste: {contrast}%
              </Label>
              <Slider
                value={[contrast]}
                onValueChange={([v]) => setContrast(v)}
                min={50}
                max={200}
                step={5}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Check className="w-4 h-4 mr-1" />
            {isSaving ? 'Salvando...' : 'Aplicar e Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
