import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SectionDoc {
  name: string;
  url: string;
}

const BUCKET = 'team-report-photos';
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_DOC_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
];
const ALLOWED_DOC_EXT = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i;

/** Remove a file from storage by extracting path from URL */
const removeFromStorage = async (url: string, pathSegments = 5) => {
  try {
    const urlParts = new URL(url).pathname.split('/');
    const filePath = urlParts.slice(-pathSegments).join('/');
    await supabase.storage.from(BUCKET).remove([filePath]);
  } catch { /* best-effort */ }
};

/** Upload a single file and return its public URL */
const uploadFile = async (file: File, storagePath: string): Promise<string | null> => {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, { cacheControl: '3600', upsert: false });
  if (error) {
    toast.error(`Erro ao enviar: ${file.name}`);
    return null;
  }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return urlData.publicUrl;
};

interface UseFileUploaderOptions {
  /** Project ID, used for building storage paths */
  projectId: string | undefined;
  /** Base folder within the bucket (e.g. 'reports/{id}/sections') */
  basePath: string;
}

export const useFileUploader = ({ projectId, basePath }: UseFileUploaderOptions) => {
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, string[]>>({});
  const [sectionDocs, setSectionDocs] = useState<Record<string, SectionDoc[]>>({});

  const handleSectionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    if (!e.target.files || !e.target.files.length || !projectId) return;
    for (const file of Array.from(e.target.files)) {
      try {
        const photoId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `${basePath}/${sectionKey}/${photoId}.${fileExt}`;
        const url = await uploadFile(file, filePath);
        if (url) {
          setSectionPhotos(prev => ({
            ...prev,
            [sectionKey]: [...(prev[sectionKey] || []), url],
          }));
        }
      } catch { toast.error(`Erro ao processar foto: ${file.name}`); }
    }
    e.target.value = '';
    toast.success('Foto(s) enviada(s) com sucesso!');
  };

  const removeSectionPhoto = async (sectionKey: string, index: number) => {
    const photos = sectionPhotos[sectionKey] || [];
    const photoUrl = photos[index];
    if (photoUrl) await removeFromStorage(photoUrl);
    setSectionPhotos(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((_, i) => i !== index),
    }));
  };

  const handleSectionDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    if (!e.target.files || !e.target.files[0] || !projectId) return;
    const file = e.target.files[0];
    if (file.size > MAX_DOC_SIZE) {
      toast.error('Arquivo excede o tamanho máximo de 20MB.');
      e.target.value = '';
      return;
    }
    if (!ALLOWED_DOC_TYPES.includes(file.type) && !file.name.match(ALLOWED_DOC_EXT)) {
      toast.error('Tipo de arquivo não permitido.');
      e.target.value = '';
      return;
    }
    try {
      const fileId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'pdf';
      const filePath = `${basePath}/${sectionKey}/docs/${fileId}.${fileExt}`;
      const url = await uploadFile(file, filePath);
      if (url) {
        setSectionDocs(prev => ({
          ...prev,
          [sectionKey]: [...(prev[sectionKey] || []), { name: file.name, url }],
        }));
        toast.success(`Documento "${file.name}" enviado com sucesso`);
      }
    } catch { toast.error(`Erro ao processar documento: ${file.name}`); }
    e.target.value = '';
  };

  const removeSectionDoc = async (sectionKey: string, index: number) => {
    const docs = sectionDocs[sectionKey] || [];
    const doc = docs[index];
    if (doc?.url) await removeFromStorage(doc.url);
    setSectionDocs(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((_, i) => i !== index),
    }));
  };

  return {
    sectionPhotos,
    setSectionPhotos,
    sectionDocs,
    setSectionDocs,
    handleSectionPhotoUpload,
    removeSectionPhoto,
    handleSectionDocUpload,
    removeSectionDoc,
  };
};
