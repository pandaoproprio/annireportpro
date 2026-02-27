import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from '@/types';
import { ImageIcon, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

interface DiaryPhoto {
  activityId: string;
  activityDate: string;
  activityDescription: string;
  activityLocation: string;
  url: string;
  caption: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  onInsert: (photos: DiaryPhoto[]) => void;
}

const isImageUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  // Exclude video extensions
  if (/\.(mp4|mov|avi|webm|mkv|wmv)(\?|$)/i.test(lower)) return false;
  // Include image extensions or assume image if no extension detected (storage URLs)
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)(\?|$)/i.test(lower) || !lower.match(/\.\w{2,5}(\?|$)/);
};

export const DiaryImagePickerDialog: React.FC<Props> = ({ open, onOpenChange, activities, onInsert }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Extract all photos from activities (only images, not videos)
  const allPhotos: DiaryPhoto[] = useMemo(() => {
    const photos: DiaryPhoto[] = [];
    activities.forEach(act => {
      (act.photos || []).forEach((url, idx) => {
        if (!isImageUrl(url)) return;
        const caption = act.photoCaptions?.[url] || act.photoCaptions?.[String(idx)] || '';
        photos.push({
          activityId: act.id,
          activityDate: act.date,
          activityDescription: act.description,
          activityLocation: act.location,
          url,
          caption,
        });
      });
    });
    return photos;
  }, [activities]);

  // Unique locations
  const locations = useMemo(() => {
    const locs = new Set(activities.map(a => a.location).filter(Boolean));
    return Array.from(locs).sort();
  }, [activities]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(p => {
      if (dateFrom && p.activityDate < dateFrom) return false;
      if (dateTo && p.activityDate > dateTo) return false;
      if (selectedActivity !== 'all' && p.activityId !== selectedActivity) return false;
      if (selectedLocation !== 'all' && p.activityLocation !== selectedLocation) return false;
      return true;
    });
  }, [allPhotos, dateFrom, dateTo, selectedActivity, selectedLocation]);

  const togglePhoto = (key: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredPhotos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPhotos.map(p => p.url)));
    }
  };

  const handleInsert = () => {
    const selectedPhotos = filteredPhotos.filter(p => selected.has(p.url));
    if (selectedPhotos.length === 0) {
      toast.error('Selecione ao menos uma imagem');
      return;
    }
    onInsert(selectedPhotos);
    toast.success(`${selectedPhotos.length} imagem(ns) inserida(s) do Diário`);
    setSelected(new Set());
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelected(new Set());
    onOpenChange(false);
  };

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Inserir Imagens do Diário de Bordo
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Atividade</Label>
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {activities.filter(a => (a.photos || []).some(isImageUrl)).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {formatDate(a.date)} - {a.description.substring(0, 40)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Local</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between border-t border-b py-2">
          <span className="text-xs text-muted-foreground">
            {filteredPhotos.length} imagem(ns) encontrada(s) • {selected.size} selecionada(s)
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
            {selected.size === filteredPhotos.length && filteredPhotos.length > 0 ? 'Desmarcar tudo' : 'Selecionar tudo'}
          </Button>
        </div>

        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma imagem encontrada com os filtros aplicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-1">
              {filteredPhotos.map((photo) => {
                const isSelected = selected.has(photo.url);
                return (
                  <div
                    key={photo.url}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                    onClick={() => togglePhoto(photo.url)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Foto do diário'}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[10px] text-white truncate">{formatDate(photo.activityDate)}</p>
                      {photo.caption && <p className="text-[9px] text-white/80 truncate">{photo.caption}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleInsert} disabled={selected.size === 0}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Inserir na seção ({selected.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
