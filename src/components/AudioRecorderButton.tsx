import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

type MicrophoneHelp = {
  title: string;
  description: string;
  steps?: string[];
};

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
  const [microphoneHelp, setMicrophoneHelp] = useState<MicrophoneHelp | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accumulatedRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.permissions?.query) return;

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const syncPermission = async () => {
      try {
        permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (!mounted) return;

        setPermissionState(permissionStatus.state);
        permissionStatus.onchange = () => {
          if (mounted) {
            setPermissionState(permissionStatus?.state ?? 'unknown');
          }
        };
      } catch {
        if (mounted) {
          setPermissionState('unknown');
        }
      }
    };

    void syncPermission();

    return () => {
      mounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const getMicrophoneHelp = useCallback((error?: unknown): MicrophoneHelp => {
    const errorName =
      error instanceof DOMException
        ? error.name
        : typeof error === 'object' && error !== null && 'name' in error
          ? String((error as { name?: unknown }).name ?? '')
          : '';

    if (
      permissionState === 'denied' ||
      errorName === 'NotAllowedError' ||
      errorName === 'PermissionDeniedError' ||
      errorName === 'SecurityError'
    ) {
      return {
        title: 'O microfone está bloqueado',
        description: 'Você pode continuar digitando normalmente. Se quiser gravar, libere o microfone no navegador e tente de novo.',
        steps: [
          'Clique no ícone ao lado do endereço do site (cadeado ou ajustes).',
          'Em “Microfone”, escolha “Permitir”.',
          'Volte ao formulário e clique em “Usar microfone” novamente.',
        ],
      };
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return {
        title: 'Nenhum microfone foi encontrado',
        description: 'Conecte um microfone ao aparelho ou continue preenchendo digitando normalmente.',
      };
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return {
        title: 'O microfone está sendo usado por outro aplicativo',
        description: 'Feche outros apps ou abas que estejam usando o microfone e tente novamente.',
      };
    }

    return {
      title: 'Não foi possível usar o microfone agora',
      description: 'Você pode continuar digitando normalmente. Se preferir gravar, tente novamente em instantes.',
    };
  }, [permissionState]);

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

    setUploaded(false);
    setMicrophoneHelp(null);
    accumulatedRef.current = '';
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneHelp({
        title: 'Este navegador não conseguiu abrir o microfone',
        description: 'Você pode continuar digitando normalmente. Se quiser gravar, tente abrir este formulário em uma versão atual do Chrome, Edge ou Safari.',
      });
      return;
    }

    if (permissionState === 'denied') {
      setMicrophoneHelp(getMicrophoneHelp({ name: 'NotAllowedError' }));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState('granted');
    } catch (error) {
      setMicrophoneHelp(getMicrophoneHelp(error));
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

      mediaRecorder.start(1000);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setMicrophoneHelp({
        title: 'Seu navegador não suporta gravação de áudio neste campo',
        description: 'Você pode continuar respondendo digitando normalmente.',
      });
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
  }, [currentText, getMicrophoneHelp, isRecording, lang, onTranscript, permissionState, stopRecording, uploadAudio]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'outline'}
          size="sm"
          onClick={startRecording}
          disabled={isUploading}
          className={cn(
            'min-w-[150px] justify-center transition-all',
            isRecording && 'animate-pulse shadow-lg shadow-destructive/30',
          )}
          title={isRecording ? 'Parar gravação' : 'Usar microfone'}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span>{isUploading ? 'Salvando...' : isRecording ? 'Parar gravação' : 'Usar microfone'}</span>
        </Button>

        {isUploading && (
          <span className="text-xs text-muted-foreground animate-pulse">Salvando áudio...</span>
        )}

        {uploaded && !isUploading && !isRecording && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3 w-3" />
            Áudio salvo
          </span>
        )}

        {!isUploading && !uploaded && !isRecording && (
          <span className="text-xs text-muted-foreground">
            Ao tocar no botão, o navegador pode pedir sua autorização.
          </span>
        )}
      </div>

      {microphoneHelp && (
        <Alert className="border-border bg-muted/40 text-foreground">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{microphoneHelp.title}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{microphoneHelp.description}</p>
            {microphoneHelp.steps?.length ? (
              <ol className="list-decimal space-y-1 pl-5">
                {microphoneHelp.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" onClick={startRecording}>
                Tentar novamente
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMicrophoneHelp(null)}>
                Fechar aviso
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};