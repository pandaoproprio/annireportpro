import jsPDF from 'jspdf';
import type { ReportObjIIData, PhotoWithCaption } from './types';

// ══════════════════════════════════════════════════════════════
// ABNT NBR 14724 — Relatório de Cumprimento do Objeto
// Layout fielmente baseado nos documentos reais do CEAP
// ══════════════════════════════════════════════════════════════

const ML = 30;   // margem esquerda 3cm
const MR = 20;   // margem direita 2cm
const MT = 30;   // margem superior 3cm
const MB = 20;   // margem inferior 2cm
const PW = 210;
const PH = 297;
const CW = PW - ML - MR; // 160mm
const FS = 12;
const LH = 1.5;
const INDENT = 12.5; // 1.25cm
const HDR_H = 22;
const FTR_H = 16;

async function loadImg(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const r = await fetch(url);
    const b = await r.blob();
    return new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
  } catch { return null; }
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function exportReportObjIIPdf(data: ReportObjIIData): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { cover, header, footer } = data;
  const enabledSections = data.sections.filter(s => s.enabled && (s.content.trim() || s.photos.length > 0));

  const [logoL, logoC, logoR] = await Promise.all([
    loadImg(header.logoLeft), loadImg(header.logoCenter), loadImg(header.logoRight),
  ]);

  const hasHdr = !!(logoL || logoC || logoR);
  const cTop = hasHdr ? MT + HDR_H : MT;
  const cBot = footer.enabled ? PH - MB - FTR_H : PH - MB;
  let y = cTop;
  let pageNum = 0;
  const lineH = FS * LH * 0.352778;

  // ── Desenha barra de logos no topo ──
  const drawHeader = () => {
    if (!hasHdr) return;
    const sz = 18;
    if (logoL) try { doc.addImage(logoL, 'JPEG', ML, MT, sz, sz); } catch {}
    if (logoC) try { doc.addImage(logoC, 'JPEG', PW / 2 - sz / 2, MT, sz, sz); } catch {}
    if (logoR) try { doc.addImage(logoR, 'JPEG', PW - MR - sz, MT, sz, sz); } catch {}
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(ML, MT + HDR_H - 2, PW - MR, MT + HDR_H - 2);
  };

  // ── Desenha rodapé institucional CEAP ──
  const drawFooter = (num: number) => {
    if (footer.enabled) {
      const fY = PH - MB - FTR_H + 2;
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.3);
      doc.line(ML, fY, PW - MR, fY);
      doc.setFont('times', 'normal');
      doc.setTextColor(80, 80, 80);
      const cx = PW / 2;
      if (footer.line1) { doc.setFontSize(8); doc.text(footer.line1, cx, fY + 4, { align: 'center' }); }
      if (footer.line2) { doc.setFontSize(7); doc.text(footer.line2, cx, fY + 8, { align: 'center' }); }
      if (footer.line3) { doc.setFontSize(7); doc.text(footer.line3, cx, fY + 12, { align: 'center' }); }
    }
    // Número da página alinhado à direita
    if (num > 0) {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const t = String(num);
      doc.text(t, PW - MR, PH - 10, { align: 'right' });
    }
  };

  const newPage = () => {
    pageNum++;
    drawFooter(pageNum > 1 ? pageNum : 0);
    doc.addPage();
    y = cTop;
    drawHeader();
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > cBot) newPage();
  };

  // ── Escreve parágrafo com indentação ABNT ──
  const writeParagraph = (text: string, indent = true) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);

    const plainText = htmlToPlain(text);
    const paragraphs = plainText.split(/\n\n+/);

    for (const para of paragraphs) {
      if (!para.trim()) { y += lineH; continue; }
      const lines = para.split(/\n/);
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (!line.trim()) { y += lineH * 0.5; continue; }
        const isBullet = line.startsWith('• ');
        const useIndent = indent && !isBullet && li === 0;
        const effW = useIndent ? CW - INDENT : CW;
        const startX = useIndent ? ML + INDENT : ML;
        const wrapped = doc.splitTextToSize(line, effW);
        for (let w = 0; w < wrapped.length; w++) {
          ensureSpace(lineH);
          doc.text(wrapped[w], w === 0 ? startX : ML, y);
          y += lineH;
        }
      }
      y += lineH * 0.3;
    }
    y += lineH * 0.2;
  };

  // ── Título de seção em negrito uppercase ──
  const writeSectionTitle = (title: string) => {
    ensureSpace(lineH * 2);
    doc.setFont('times', 'bold');
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);
    const wrapped = doc.splitTextToSize(title.toUpperCase(), CW);
    for (const l of wrapped) {
      ensureSpace(lineH);
      doc.text(l, ML, y);
      y += lineH;
    }
    y += lineH * 0.5;
  };

  // ══════════ CAPA ══════════
  pageNum = 1;

  // Logos na capa
  if (cover.showLogos) {
    const sz = 22;
    const logoY = MT + 10;
    if (logoL) try { doc.addImage(logoL, 'JPEG', ML, logoY, sz, sz); } catch {}
    if (logoC) try { doc.addImage(logoC, 'JPEG', PW / 2 - sz / 2, logoY, sz, sz); } catch {}
    if (logoR) try { doc.addImage(logoR, 'JPEG', PW - MR - sz, logoY, sz, sz); } catch {}
  }

  // Título centralizado
  let cy = PH / 2 - 30;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(cover.title || 'RELATÓRIO DE CUMPRIMENTO DO OBJETO', CW);
  for (const l of titleLines) {
    doc.text(l, PW / 2, cy, { align: 'center' });
    cy += 10;
  }

  // Nome do projeto
  if (data.projectName) {
    cy += 4;
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    const projLines = doc.splitTextToSize(data.projectName, CW);
    for (const l of projLines) {
      doc.text(l, PW / 2, cy, { align: 'center' });
      cy += 8;
    }
  }

  // Termo de fomento
  if (cover.fomentoNumber) {
    cy += 2;
    doc.setFontSize(12);
    doc.text(cover.fomentoNumber, PW / 2, cy, { align: 'center' });
    cy += 8;
  }

  // Rodapé institucional na capa
  if (footer.enabled) {
    const fY = PH - MB - FTR_H + 2;
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(ML, fY, PW - MR, fY);
    doc.setFont('times', 'normal');
    doc.setTextColor(80, 80, 80);
    const cx = PW / 2;
    if (footer.line1) { doc.setFontSize(8); doc.text(footer.line1, cx, fY + 4, { align: 'center' }); }
    if (footer.line2) { doc.setFontSize(7); doc.text(footer.line2, cx, fY + 8, { align: 'center' }); }
    if (footer.line3) { doc.setFontSize(7); doc.text(footer.line3, cx, fY + 12, { align: 'center' }); }
  }

  // ══════════ CONTEÚDO ══════════
  // Cada seção começa em nova página (exceto a primeira que vem logo após a capa)
  for (let i = 0; i < enabledSections.length; i++) {
    const section = enabledSections[i];
    newPage();

    writeSectionTitle(section.title);
    if (section.content.trim()) writeParagraph(section.content);

    // Fotos em grid 2 colunas (landscape) com legendas
    if (section.photos.length > 0) {
      y += lineH * 0.5;
      const cols = 2;
      const gap = 6;
      const pw = (CW - gap * (cols - 1)) / cols;
      const ph = pw * 0.5625; // 16:9 ratio para landscape
      const captH = 6;
      const cellH = ph + captH + 4;

      for (let p = 0; p < section.photos.length; p++) {
        const col = p % cols;
        if (col === 0) ensureSpace(cellH);

        const px = ML + col * (pw + gap);
        const py = y;
        const photo = section.photos[p];
        const imgData = await loadImg(photo.url);

        if (imgData) {
          try { doc.addImage(imgData, 'JPEG', px, py, pw, ph); } catch {}
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.rect(px, py, pw, ph);
        }

        // Legenda centralizada abaixo da foto
        if (photo.caption) {
          doc.setFont('times', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          const cl = doc.splitTextToSize(photo.caption, pw);
          for (let ci = 0; ci < Math.min(cl.length, 2); ci++) {
            doc.text(cl[ci], px + pw / 2, py + ph + 3 + ci * 3.5, { align: 'center' });
          }
          doc.setTextColor(0, 0, 0);
        }

        if (col === cols - 1 || p === section.photos.length - 1) {
          y += cellH;
        }
      }
    }
  }

  // Última página: footer final
  pageNum++;
  drawFooter(pageNum);

  const safeName = data.projectName?.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').trim().replace(/\s+/g, '_') || 'Projeto';
  doc.save(`Relatorio_Objeto_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
