import { supabase } from '@/integrations/supabase/client';
import type { ReportV2Data } from './types';

export async function generateReportPdf(data: ReportV2Data): Promise<Blob> {
  const { data: result, error } = await supabase.functions.invoke('gerar-pdf-relatorio', {
    body: data,
    headers: { 'Content-Type': 'application/json' },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao gerar PDF');
  }

  // The edge function returns the PDF as a blob
  if (result instanceof Blob) {
    return result;
  }

  // If base64 string returned
  if (typeof result === 'string') {
    const byteChars = atob(result);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
  }

  // If result has a pdf field (base64)
  if (result?.pdf) {
    const byteChars = atob(result.pdf);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
  }

  throw new Error('Formato de resposta inesperado');
}
