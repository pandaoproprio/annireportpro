import html2pdf from 'html2pdf.js';

export async function generatePdf(filename: string): Promise<void> {
  const element = document.getElementById('report-preview');
  if (!element) {
    throw new Error('Elemento #report-preview não encontrado');
  }

  await html2pdf()
    .set({
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(element)
    .save();
}
