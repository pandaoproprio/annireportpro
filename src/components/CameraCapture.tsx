import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Video, X, Check, Square, Loader2, SwitchCamera } from 'lucide-react';
import { toast } from 'sonner';

type CaptureMode = 'photo' | 'video';

interface CameraCaptureProps {
  /** Called with the captured File ready for upload */
  onCapture: (file: File) => void;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, disabled }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopStream = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream]);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      stopStream();
      const constraints: MediaStreamConstraints = {
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video',
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      setFacingMode(facing);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Permissão de câmera negada. Habilite nas configurações do navegador.');
      } else {
        toast.error('Câmera não disponível neste dispositivo.');
      }
      setOpen(false);
    }
  }, [mode, stopStream]);

  useEffect(() => {
    if (open && !preview) {
      startCamera(facingMode);
    }
    return () => {
      if (!open) stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleClose = () => {
    stopStream();
    setPreview(null);
    setPreviewFile(null);
    setRecording(false);
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setOpen(false);
  };

  const switchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    startCamera(next);
  };

  // ─── Photo ───
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPreview(URL.createObjectURL(blob));
      setPreviewFile(file);
      stopStream();
    }, 'image/jpeg', 0.9);
  };

  // ─── Video ───
  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: mimeType });
      setPreview(URL.createObjectURL(blob));
      setPreviewFile(file);
      stopStream();
    };
    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ─── Confirm / Discard ───
  const confirmCapture = async () => {
    if (!previewFile) return;
    setLoading(true);
    try {
      onCapture(previewFile);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const discardPreview = () => {
    setPreview(null);
    setPreviewFile(null);
    startCamera(facingMode);
  };

  const openWithMode = (m: CaptureMode) => {
    // Check if getUserMedia is available
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Captura de câmera não suportada neste navegador.');
      return;
    }
    setMode(m);
    setPreview(null);
    setPreviewFile(null);
    setOpen(true);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => openWithMode('photo')} disabled={disabled}>
          <Camera className="w-4 h-4 mr-2" /> Capturar Foto
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => openWithMode('video')} disabled={disabled}>
          <Video className="w-4 h-4 mr-2" /> Gravar Vídeo
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{mode === 'photo' ? 'Capturar Foto' : 'Gravar Vídeo'}</DialogTitle>
          </DialogHeader>

          <div className="relative bg-black aspect-video flex items-center justify-center">
            {preview ? (
              mode === 'photo' ? (
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <video src={preview} controls className="w-full h-full object-contain" />
              )
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {recording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                <div className="w-2 h-2 rounded-full bg-destructive-foreground" />
                Gravando...
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="p-4 flex items-center justify-center gap-3">
            {preview ? (
              <>
                <Button variant="outline" onClick={discardPreview} disabled={loading}>
                  <X className="w-4 h-4 mr-2" /> Descartar
                </Button>
                <Button onClick={confirmCapture} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirmar
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={switchCamera} title="Alternar câmera">
                  <SwitchCamera className="w-5 h-5" />
                </Button>

                {mode === 'photo' ? (
                  <Button size="lg" className="rounded-full w-14 h-14" onClick={takePhoto}>
                    <Camera className="w-6 h-6" />
                  </Button>
                ) : recording ? (
                  <Button size="lg" variant="destructive" className="rounded-full w-14 h-14" onClick={stopRecording}>
                    <Square className="w-6 h-6" />
                  </Button>
                ) : (
                  <Button size="lg" className="rounded-full w-14 h-14 bg-destructive hover:bg-destructive/90" onClick={startRecording}>
                    <Video className="w-6 h-6" />
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CameraCapture;
