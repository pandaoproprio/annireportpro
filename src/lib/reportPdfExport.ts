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

export async function exportReportToPdf(data: ReportPdfExportData): Promise<void> {
  const { data: result, error } = await supabase.functions.invoke('export-object-report-pdf', {
    body: data,
    headers: { 'Content-Type': 'application/json' },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao gerar PDF');
  }

  const pdfBlob = normalizePdfResult(result);
  const safeProjectName = data.project.name.replace(/[^a-zA-Z0-9-_À-ÿ\s]/g, '').trim().replace(/\s+/g, '_');
  const filename = `Relatorio_${safeProjectName || 'Projeto'}_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(pdfBlob, filename);
}
