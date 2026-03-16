import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AudioRecorderButtonProps {
  onTranscript: (text: string) => void;
  onAudioUrl?: (url: string) => void;
  currentText?: string;
  className?: string;
  lang?: string;
  /** Storage path prefix, e.g. "forms/{formId}/audio" */
  storagePath?: string;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const BUCKET = 'team-report-photos';

export const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  onTranscript,
  onAudioUrl,
  currentText = '',
  className,
  lang = 'pt-BR',
  storagePath = 'forms/audio',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accumulatedRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const uploadAudio = useCallback(async (blob: Blob) => {
    setIsUploading(true);
    try {
      const audioId = crypto.randomUUID();
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'ogg';
      const filePath = `${storagePath}/${audioId}.${ext}`;
      const file = new File([blob], `audio-${audioId}.${ext}`, { type: blob.type });

      const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Audio upload error:', error);
        toast.error('Erro ao salvar áudio. A transcrição foi mantida.');
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      onAudioUrl?.(urlData.publicUrl);
      setUploaded(true);
      toast.success('Áudio salvo com sucesso!');
    } catch (err) {
      console.error('Audio upload exception:', err);
      toast.error('Erro ao salvar áudio.');
    } finally {
      setIsUploading(false);
    }
  }, [storagePath, onAudioUrl]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    // Reset state
    setUploaded(false);
    accumulatedRef.current = '';
    chunksRef.current = [];

    // Request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      toast.error('Permissão de microfone negada. Habilite nas configurações do navegador.');
      return;
    }

    // Start MediaRecorder for audio capture
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          uploadAudio(blob);
        }
      };

      mediaRecorder.start(1000); // collect data every second
    } catch (err) {
      console.error('MediaRecorder error:', err);
      toast.error('Seu navegador não suporta gravação de áudio.');
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    // Start SpeechRecognition for live transcription
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          accumulatedRef.current += finalTranscript;
          const separator = currentText && !currentText.endsWith(' ') && !currentText.endsWith('\n') ? ' ' : '';
          onTranscript(currentText + separator + accumulatedRef.current);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          console.error('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    }

    setIsRecording(true);
    toast.info('🎙️ Gravando... Clique novamente para parar.', { duration: 2000 });
  }, [isRecording, lang, currentText, onTranscript, stopRecording, uploadAudio]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        size="icon"
        onClick={startRecording}
        disabled={isUploading}
        className={cn(
          'h-8 w-8 shrink-0 transition-all',
          isRecording && 'animate-pulse shadow-lg shadow-destructive/30',
        )}
        title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {isUploading && (
        <span className="text-xs text-muted-foreground animate-pulse">Salvando áudio...</span>
      )}
      {uploaded && !isUploading && !isRecording && (
        <span className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Áudio salvo
        </span>
      )}
    </div>
  );
};
