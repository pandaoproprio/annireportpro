import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScanLine, Loader2, Camera, Upload, Check, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface OcrAttendanceButtonProps {
  onNamesExtracted: (names: string[]) => void;
}

export const OcrAttendanceButton: React.FC<OcrAttendanceButtonProps> = ({ onNamesExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [extractedNames, setExtractedNames] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<number>>(new Set());
  const [confidence, setConfidence] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('ocr-attendance', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const names = (data?.names || []).filter((n: string) => n.trim().length > 1);
      if (names.length === 0) {
        toast.info('Nenhum nome encontrado na imagem. Tente com uma foto mais nítida.');
        return;
      }

      setExtractedNames(names);
      setSelectedNames(new Set(names.map((_: string, i: number) => i)));
      setConfidence(data?.confidence || 'medium');
      setShowResults(true);
    } catch (err: any) {
      console.error('OCR error:', err);
      toast.error('Erro ao processar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleName = (idx: number) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const confirmSelection = () => {
    const names = extractedNames.filter((_, i) => selectedNames.has(i));
    onNamesExtracted(names);
    toast.success(`${names.length} nome(s) adicionado(s) à equipe`);
    setShowResults(false);
    setExtractedNames([]);
  };

  const confidenceLabel = {
    high: { text: 'Alta confiança', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    medium: { text: 'Confiança média', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    low: { text: 'Baixa confiança', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  }[confidence] || { text: '', color: '' };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImage(file);
          e.target.value = '';
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isProcessing}
        onClick={() => fileRef.current?.click()}
        className="gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processando OCR...
          </>
        ) : (
          <>
            <ScanLine className="w-4 h-4" />
            OCR Lista de Presença
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              Nomes Extraídos
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {extractedNames.length} nome(s) encontrado(s)
              {confidenceLabel.text && (
                <Badge variant="outline" className={confidenceLabel.color}>
                  {confidenceLabel.text}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            {extractedNames.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleName(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                  selectedNames.has(idx)
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/30 border border-transparent opacity-50'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  selectedNames.has(idx)
                    ? 'bg-primary text-primary-foreground'
                    : 'border-2 border-muted-foreground/30'
                }`}>
                  {selectedNames.has(idx) && <Check className="w-3 h-3" />}
                </div>
                <span className="text-sm">{name}</span>
              </button>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowResults(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSelection} disabled={selectedNames.size === 0}>
              Adicionar {selectedNames.size} nome(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
