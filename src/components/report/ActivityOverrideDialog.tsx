import React, { useEffect, useRef, useState } from 'react';
import { Activity, ActivityOverride } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ArrowUp, ArrowDown, Upload, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null; // original (sem overrides aplicados)
  override: ActivityOverride | undefined;
  onSave: (patch: Partial<ActivityOverride>) => void;
  onRestore: () => void;
  onUploadPhoto: (file: File) => Promise<string | null>;
}

export const ActivityOverrideDialog: React.FC<Props> = ({
  open, onOpenChange, activity, override, onSave, onRestore, onUploadPhoto,
}) => {
  const [description, setDescription] = useState('');
  const [results, setResults] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState(false);
  const [hideDescription, setHideDescription] = useState(false);
  const [hideResults, setHideResults] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activity) return;
    setDescription(override?.description ?? activity.description ?? '');
    setResults(override?.results ?? activity.results ?? '');
    setPhotos(override?.photos ?? activity.photos ?? []);
    setCaptions({ ...(activity.photoCaptions || {}), ...(override?.photoCaptions || {}) });
    setHidden(!!override?.hidden);
    setHideDescription(!!override?.hideDescription);
    setHideResults(!!override?.hideResults);
  }, [activity, override, open]);

  if (!activity) return null;

  const handleSave = () => {
    onSave({
      description: description !== activity.description ? description : undefined,
      results: results !== activity.results ? results : undefined,
      photos,
      photoCaptions: captions,
      hidden,
      hideDescription,
      hideResults,
    });
    onOpenChange(false);
    toast.success('Ajustes do relatório salvos. O Diário de Bordo permanece inalterado.');
  };

  const handleRestore = () => {
    onRestore();
    onOpenChange(false);
    toast.success('Conteúdo original do Diário restaurado neste relatório.');
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPhotos(next);
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    for (const file of Array.from(e.target.files)) {
      const url = await onUploadPhoto(file);
      if (url) setPhotos(prev => [...prev, url]);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasOverride = !!override;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar atividade no relatório</DialogTitle>
          <DialogDescription>
            As alterações ficam salvas apenas neste relatório. O registro original no Diário de Bordo não será alterado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="font-medium">Ocultar do relatório</Label>
                <p className="text-xs text-muted-foreground">A atividade não aparecerá no PDF nem na pré-visualização.</p>
              </div>
              <Switch checked={hidden} onCheckedChange={setHidden} />
            </div>

            <div>
              <Label>Descrição / relato</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} className="mt-1" />
            </div>

            <div>
              <Label>Resultados</Label>
              <Textarea value={results} onChange={e => setResults(e.target.value)} rows={3} className="mt-1" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Fotos</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" /> Adicionar
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
              </div>
              {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma foto.</p>
              ) : (
                <div className="space-y-2">
                  {photos.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="flex items-center gap-2 border rounded-md p-2">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded" />
                      <Input
                        placeholder="Legenda"
                        value={captions[url] || ''}
                        onChange={e => setCaptions(prev => ({ ...prev, [url]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => movePhoto(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => movePhoto(idx, 1)} disabled={idx === photos.length - 1}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removePhoto(idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleRestore} disabled={!hasOverride}>
            <RotateCcw className="w-4 h-4 mr-1" /> Restaurar original
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={handleSave}>Salvar ajustes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
