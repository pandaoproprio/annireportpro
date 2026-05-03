import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import type { Project, Activity, ExpenseItem, ReportSection, ReportPhotoMeta, PhotoGroup } from '@/types';
import type { PageLayout } from '@/types/imageLayout';
import type { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

export interface ReportPdfExportData {
  project: Project;
  activities: Activity[];
  sections: ReportSection[];
  objectText: string;
  summary: string;
  goalNarratives: Record<string, string>;
  goalPhotos: Record<string, string[]>;
  otherActionsNarrative: string;
  otherActionsPhotos: string[];
  communicationNarrative: string;
  communicationPhotos: string[];
  satisfaction: string;
  futureActions: string;
  expenses: ExpenseItem[];
  links: { attendance: string; registration: string; media: string };
  linkDisplayNames?: { attendance: string; registration: string; media: string };
  sectionPhotos?: Record<string, string[]>;
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  visualConfig?: ReportVisualConfig;
  pageLayouts?: Record<string, PageLayout>;
  sectionPhotoGroups?: Record<string, PhotoGroup[]>;
  selectedVideoUrls?: string[];
  hideActivitiesBySection?: Record<string, boolean>;
}

const base64ToBlob = (base64: string): Blob => {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
};

const normalizePdfResult = (result: unknown): Blob => {
  if (result instanceof Blob) return result;

  if (typeof result === 'string') {
    return base64ToBlob(result);
  }

  if (result instanceof ArrayBuffer) {
    return new Blob([result], { type: 'application/pdf' });
  }

  if (result && typeof result === 'object') {
    const record = result as { pdf?: string; data?: string };
    if (typeof record.pdf === 'string') return base64ToBlob(record.pdf);
    if (typeof record.data === 'string') return base64ToBlob(record.data);
  }

  throw new Error('Formato de resposta inesperado ao gerar PDF');
};

const readPdfBlobFromResponse = async (response: Response): Promise<Blob> => {
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    return new Blob([buffer], { type: 'application/pdf' });
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    const chunk = new Uint8Array(value);
    chunks.push(chunk);
    totalBytes += chunk.byteLength;
  }

  if (totalBytes === 0) throw new Error('PDF vazio retornado');
  return new Blob(chunks, { type: 'application/pdf' });
};

const fetchPdfBlob = async (data: ReportPdfExportData, token: string): Promise<Blob> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/export-object-report-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/pdf, application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let msg = 'Erro ao gerar PDF';
    try {
      const errJson = await response.json();
      msg = errJson.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return readPdfBlobFromResponse(response);
};

const invokePdfBlob = async (data: ReportPdfExportData): Promise<Blob> => {
  const { data: result, error } = await supabase.functions.invoke('export-object-report-pdf', {
    body: data,
    headers: {
      'Accept': 'application/pdf, application/json',
      'Content-Type': 'application/json',
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao gerar PDF');
  }

  return normalizePdfResult(result);
};

export async function exportReportToPdf(data: ReportPdfExportData): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Usuário não autenticado');

  let pdfBlob: Blob;
  try {
    pdfBlob = await fetchPdfBlob(data, token);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const shouldFallback = message.includes('failed to fetch') || message.includes('network') || message.includes('load failed');
    if (!shouldFallback) throw error;
    pdfBlob = await invokePdfBlob(data);
  }

  if (pdfBlob.size === 0) throw new Error('PDF vazio retornado');

  const safeProjectName = data.project.name.replace(/[^a-zA-Z0-9-_À-ÿ\s]/g, '').trim().replace(/\s+/g, '_');
  const filename = `Relatorio_${safeProjectName || 'Projeto'}_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(pdfBlob, filename);
}
