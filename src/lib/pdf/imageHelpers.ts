import { CW, ML, FONT_BODY, FONT_CAPTION, LINE_H, MAX_Y } from './constants';
import { ensureSpace, addPage, getContentStartY } from './pageLayout';
import type { PdfContext } from './pageLayout';
import type { PageLayout } from '@/types/imageLayout';
import { supabase } from '@/integrations/supabase/client';

const PHOTO_SECTION_TITLE_GAP_TOP = 2;
const PHOTO_SECTION_TITLE_GAP_BOTTOM = 3;
const PHOTO_ROW_GAP = 4;
const PHOTO_GRID_COLUMNS = 3;
const PHOTO_GRID_ROWS_PER_PAGE = 2;
const PHOTO_MAX_HEIGHT = 200 * 0.264583;

const getRowsForPage = (availableHeight: number, rowsRemaining: number, minRowBlockHeight: number) => {
  const maxCandidate = Math.min(PHOTO_GRID_ROWS_PER_PAGE, rowsRemaining);

  for (let candidate = maxCandidate; candidate >= 1; candidate--) {
    const requiredHeight = candidate * minRowBlockHeight + (candidate - 1) * PHOTO_ROW_GAP;
    if (availableHeight >= requiredHeight) return candidate;
  }

  return 1;
};

const getAdaptiveCellHeight = (
  availableHeight: number,
  rowsOnPage: number,
  captionBlockHeight: number,
  preferredHeight: number,
  minHeight: number,
  maxHeight: number,
) => {
  const computed = (availableHeight - rowsOnPage * captionBlockHeight - (rowsOnPage - 1) * PHOTO_ROW_GAP) / rowsOnPage;
  return Math.max(minHeight, Math.min(maxHeight, computed, preferredHeight));
};

// ── Image loader ──
const imageToJpegDataUrl = (img: HTMLImageElement): string | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return null;

    // Evita fundo preto em imagens com transparência
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.drawImage(img, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (e) {
    console.warn('[loadImage] jpeg conversion error', e);
    return null;
  }
};

const blobToImageData = async (blob: Blob, sourceLabel: string): Promise<{ data: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const sourceDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const jpegDataUrl = imageToJpegDataUrl(img);
        if (!jpegDataUrl) {
          console.warn('[loadImage] jpeg conversion failed', sourceLabel);
          resolve(null);
          return;
        }
        resolve({ data: jpegDataUrl, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        console.warn('[loadImage] img decode error', sourceLabel);
        resolve(null);
      };
      img.src = sourceDataUrl;
    };
    reader.onerror = () => {
      console.warn('[loadImage] reader error', sourceLabel);
      resolve(null);
    };
    reader.readAsDataURL(blob);
  });
};

const parseStorageObjectUrl = (rawUrl: string): { bucket: string; path: string } | null => {
  try {
    const u = new URL(rawUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const objectIdx = parts.indexOf('object');
    if (objectIdx === -1) return null;

    // /storage/v1/object/{public|authenticated|sign}/{bucket}/{path...}
    const visibility = parts[objectIdx + 1];
    if (!['public', 'authenticated', 'sign'].includes(visibility)) return null;

    const bucket = parts[objectIdx + 2];
    const path = parts.slice(objectIdx + 3).join('/');
    if (!bucket || !path) return null;

    return { bucket, path: decodeURIComponent(path) };
  } catch {
    return null;
  }
};

const loadImageViaStorageDownload = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  const parsed = parseStorageObjectUrl(url);
  if (!parsed) return null;

  try {
    const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path);
    if (error || !data) {
      console.warn('[loadImage] storage download failed', parsed.bucket, parsed.path, error?.message);
      return null;
    }
    return await blobToImageData(data, `${parsed.bucket}/${parsed.path}`);
  } catch (e) {
    console.warn('[loadImage] storage download exception', url, e);
    return null;
  }
};

const loadImageViaFetch = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      console.warn('[loadImage] fetch failed with status', response.status, url);
      return null;
    }
    const blob = await response.blob();
    return await blobToImageData(blob, url);
  } catch (e) {
    console.warn('[loadImage] fetch exception', url, e);
    return null;
  }
};

const loadImageViaElement = (url: string, useAnonymousCrossOrigin: boolean = true): Promise<{ data: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    if (useAnonymousCrossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const jpegDataUrl = imageToJpegDataUrl(img);
      if (!jpegDataUrl) { resolve(null); return; }
      resolve({ data: jpegDataUrl, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { console.warn('[loadImage] element error', url); resolve(null); };
    img.src = url;
  });
};

export const loadImage = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  if (!url) return null;
  const normalizedUrl = url.trim();

  // Data URL (base64) é melhor decodificada direto em elemento
  if (normalizedUrl.startsWith('data:image/')) {
    const fromDataUrl = await loadImageViaElement(normalizedUrl, false);
    if (fromDataUrl) return fromDataUrl;
  }

  // 1) Fetch direto
  const fetchResult = await loadImageViaFetch(normalizedUrl);
  if (fetchResult) return fetchResult;

  // 2) Fallback robusto: download via SDK de storage (evita problemas de URL pública/signed)
  const storageResult = await loadImageViaStorageDownload(normalizedUrl);
  if (storageResult) return storageResult;

  // 3) Último fallback: elemento HTMLImage
  const elementResult = await loadImageViaElement(normalizedUrl, true);
  if (elementResult) return elementResult;

  console.warn('[loadImage] all strategies failed for:', normalizedUrl);
  return null;
};

// ── Inline image ──
export const addInlineImage = async (ctx: PdfContext, src: string, caption?: string, widthPct?: number): Promise<void> => {
  const imgData = await loadImage(src);
  if (!imgData) return;
  const { pdf } = ctx;
  const pct = Math.max(20, Math.min(100, widthPct || 100));
  const maxW = CW * (pct / 100);
  const maxH = 110;
  const aspect = imgData.width / imgData.height;
  let drawW = maxW;
  let drawH = drawW / aspect;
  if (drawH > maxH) { drawH = maxH; drawW = drawH * aspect; }
  const totalH = drawH + (caption ? 14 : 4);
  ensureSpace(ctx, totalH);
  const x = ML + (CW - drawW) / 2;
  try { pdf.addImage(imgData.data, 'JPEG', x, ctx.currentY, drawW, drawH); } catch (e) { console.warn('Inline img error:', e); }
  ctx.currentY += drawH + 2;
  if (caption) {
    pdf.setFontSize(FONT_CAPTION);
    pdf.setFont('times', 'italic');
    const capLines: string[] = pdf.splitTextToSize(caption, CW);
    for (let j = 0; j < capLines.length; j++) {
      pdf.text(capLines[j], ML + (CW - pdf.getTextWidth(capLines[j])) / 2, ctx.currentY);
      ctx.currentY += 4.5;
    }
  }
  ctx.currentY += 4;
};

// ── Gallery grid ──
export const addGalleryGrid = async (ctx: PdfContext, images: { src: string; caption: string }[], columns: number = 2): Promise<void> => {
  if (!images || images.length === 0) return;
  const { pdf } = ctx;
  const cols = Math.max(1, Math.min(4, columns));
  const COL_GAP = 6;
  const photoW = (CW - COL_GAP * (cols - 1)) / cols;
   const CAPTION_H = 8;
  const IMG_PADDING = 2;
   const preferredCellH = Math.min(photoW * 0.68, 52);
   const minCellH = Math.min(photoW * 0.52, 40);
   const maxCellH = Math.min(photoW * 0.74, 56);

  let idx = 0;
  while (idx < images.length) {
     const rowsRemaining = Math.ceil((images.length - idx) / cols);
     const availableHeight = MAX_Y - ctx.currentY;
     const minRowBlockHeight = minCellH + CAPTION_H;
     const rowsOnPage = getRowsForPage(availableHeight, rowsRemaining, minRowBlockHeight);
     const cellH = getAdaptiveCellHeight(availableHeight, rowsOnPage, CAPTION_H, preferredCellH, minCellH, maxCellH);
     const rowNeeded = cellH + CAPTION_H;
     ensureSpace(ctx, rowNeeded);
    const rowY = ctx.currentY;

    for (let col = 0; col < cols && idx < images.length; col++) {
      const x = ML + col * (photoW + COL_GAP);

      // Fill cell background
      pdf.setFillColor(248, 248, 248);
       pdf.rect(x, rowY, photoW, cellH, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.4);
       pdf.rect(x, rowY, photoW, cellH, 'S');

      const imgData = await loadImage(images[idx].src);
      if (imgData) {
        const innerW = photoW - IMG_PADDING * 2;
         const innerH = cellH - IMG_PADDING * 2;
        const imgAspect = imgData.width / imgData.height;
        let drawW: number, drawH: number;
        if (imgAspect > innerW / innerH) { drawW = innerW; drawH = innerW / imgAspect; }
        else { drawH = innerH; drawW = innerH * imgAspect; }
        const drawX = x + (photoW - drawW) / 2;
         const drawY = rowY + (cellH - drawH) / 2;
        try { pdf.addImage(imgData.data, 'JPEG', drawX, drawY, drawW, drawH); } catch (e) { console.warn('Gallery img error:', e); }
      }
      const cap = images[idx].caption;
      if (cap) {
        pdf.setFontSize(8);
        pdf.setFont('times', 'italic');
        pdf.setTextColor(80, 80, 80);
        const capLines: string[] = pdf.splitTextToSize(cap, photoW - 6);
        for (let j = 0; j < Math.min(capLines.length, 2); j++) {
           pdf.text(capLines[j], x + photoW / 2, rowY + cellH + 3 + j * 3.3, { align: 'center' });
        }
        pdf.setTextColor(0, 0, 0);
      }
      idx++;
    }
     ctx.currentY = rowY + cellH + CAPTION_H + PHOTO_ROW_GAP;
  }
  ctx.currentY += 2;
};

// ── Photo grid ──
export const addPhotoGrid = async (
  ctx: PdfContext, photoUrls: string[], sectionLabel: string,
  captions?: string[], groups?: { id: string; caption: string; photoIds: string[] }[],
  imageLoader: typeof loadImage = loadImage,
): Promise<void> => {
  if (photoUrls.length === 0) return;
  const { pdf } = ctx;

  const sectionStartY = getContentStartY(ctx);
  if (sectionLabel.trim().length > 0 && ctx.currentY > sectionStartY + 0.5) addPage(ctx);

  const COL_GAP = 8;
  const CAPTION_LINE_H = 3.3;
  const CAPTION_MAX_LINES = 3;
  const CAPTION_BLOCK_H = CAPTION_LINE_H * CAPTION_MAX_LINES + 1.5;
  const IMG_PADDING = 2;
  const photoW = (CW - COL_GAP * (PHOTO_GRID_COLUMNS - 1)) / PHOTO_GRID_COLUMNS;
  const preferredCellH = Math.min(PHOTO_MAX_HEIGHT, photoW * 0.78);
  const minCellH = Math.min(preferredCellH, 34);
  const minRowBlockHeight = minCellH + CAPTION_BLOCK_H;

  const ensureSectionStart = (titleLinesCount: number) => {
    const requiredHeight = titleLinesCount * LINE_H + PHOTO_SECTION_TITLE_GAP_TOP + PHOTO_SECTION_TITLE_GAP_BOTTOM + minRowBlockHeight;
    if (ctx.currentY + requiredHeight > MAX_Y) addPage(ctx);
  };

  const drawPhotoTitle = (title: string) => {
    const titleLines: string[] = pdf.splitTextToSize(title, CW);
    ensureSectionStart(titleLines.length);
    ctx.currentY += PHOTO_SECTION_TITLE_GAP_TOP;
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    for (const tLine of titleLines) {
      pdf.text(tLine, ML, ctx.currentY);
      ctx.currentY += LINE_H;
    }
    ctx.currentY += PHOTO_SECTION_TITLE_GAP_BOTTOM;
  };

  const drawGroupTitle = (title: string) => {
    const titleLines: string[] = pdf.splitTextToSize(title, CW);
    const requiredHeight = titleLines.length * LINE_H + 1.5 + minRowBlockHeight;
    if (ctx.currentY + requiredHeight > MAX_Y) addPage(ctx);
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    for (const line of titleLines) {
      pdf.text(line, ML, ctx.currentY);
      ctx.currentY += LINE_H;
    }
    ctx.currentY += 1.5;
  };

  const renderRows = async (indices: number[]) => {
    let offset = 0;

    while (offset < indices.length) {
      const rowsRemaining = Math.ceil((indices.length - offset) / PHOTO_GRID_COLUMNS);
      const availableHeight = MAX_Y - ctx.currentY;
      const rowsOnPage = getRowsForPage(availableHeight, rowsRemaining, minRowBlockHeight);
      const cellH = getAdaptiveCellHeight(availableHeight, rowsOnPage, CAPTION_BLOCK_H, preferredCellH, minCellH, PHOTO_MAX_HEIGHT);

      for (let row = 0; row < rowsOnPage && offset < indices.length; row++) {
        const rowIndices = indices.slice(offset, offset + PHOTO_GRID_COLUMNS);
        const rowNeeded = cellH + CAPTION_BLOCK_H;
        ensureSpace(ctx, rowNeeded + (row < rowsOnPage - 1 ? PHOTO_ROW_GAP : 0));
        const rowY = ctx.currentY;
        const rowWidth = rowIndices.length * photoW + Math.max(0, rowIndices.length - 1) * COL_GAP;
        const rowStartX = ML + (CW - rowWidth) / 2;

        for (let col = 0; col < rowIndices.length; col++) {
          const idx = rowIndices[col];
          const x = rowStartX + col * (photoW + COL_GAP);
          const imgData = await imageLoader(photoUrls[idx]);

          pdf.setFillColor(248, 248, 248);
          pdf.rect(x, rowY, photoW, cellH, 'F');
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.4);
          pdf.rect(x, rowY, photoW, cellH, 'S');

          if (imgData) {
            const innerW = photoW - IMG_PADDING * 2;
            const innerH = cellH - IMG_PADDING * 2;
            const imgAspect = imgData.width / imgData.height;
            let drawW = innerW;
            let drawH = drawW / imgAspect;

            if (drawH > innerH) {
              drawH = innerH;
              drawW = drawH * imgAspect;
            }

            const drawX = x + (photoW - drawW) / 2;
            const drawY = rowY + (cellH - drawH) / 2;
            try { pdf.addImage(imgData.data, 'JPEG', drawX, drawY, drawW, drawH); } catch (e) { console.warn('Image error:', e); }
          }

          const caption = captions?.[idx] || `Foto ${idx + 1}`;
          pdf.setFontSize(FONT_CAPTION);
          pdf.setFont('times', 'italic');
          pdf.setTextColor(80, 80, 80);
          const capLines: string[] = pdf.splitTextToSize(caption, photoW - 6);
          const capY = rowY + cellH + CAPTION_LINE_H;
          for (let cl = 0; cl < Math.min(capLines.length, CAPTION_MAX_LINES); cl++) {
            pdf.text(capLines[cl], x + photoW / 2, capY + cl * CAPTION_LINE_H, { align: 'center' });
          }
          pdf.setTextColor(0, 0, 0);
        }

        offset += rowIndices.length;
        ctx.currentY = rowY + cellH + CAPTION_BLOCK_H + PHOTO_ROW_GAP;
      }

      if (offset < indices.length) addPage(ctx);
    }
  };

  if (sectionLabel && sectionLabel.trim().length > 0) {
    drawPhotoTitle(`REGISTROS FOTOGRÁFICOS – ${sectionLabel.toUpperCase()}`);
  }

  if (groups && groups.length > 0) {
    const groupedIndices = new Set(groups.flatMap(g => g.photoIds.map(Number)));
    for (const group of groups) {
      const indices = group.photoIds.map(Number).filter(i => i < photoUrls.length);
      if (indices.length === 0) continue;
      drawGroupTitle(group.caption);
      await renderRows(indices);
      ctx.currentY += 2;
    }
    const ungrouped = photoUrls.map((_, i) => i).filter(i => !groupedIndices.has(i));
    if (ungrouped.length > 0) {
      await renderRows(ungrouped);
    }
  } else {
    await renderRows(photoUrls.map((_, i) => i));
  }
};

// ── Photo layout (Konva coordinates) ──
export const addPhotoLayout = async (ctx: PdfContext, layout: PageLayout, sectionLabel: string): Promise<void> => {
  if (!layout.images || layout.images.length === 0) return;
  const { pdf } = ctx;
  addPage(ctx);

  if (sectionLabel && sectionLabel.trim().length > 0) {
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    const titleText = `REGISTROS FOTOGRÁFICOS – ${sectionLabel.toUpperCase()}`;
    const titleLines: string[] = pdf.splitTextToSize(titleText, CW);
    for (const tLine of titleLines) {
      pdf.text(tLine, ML, ctx.currentY);
      ctx.currentY += LINE_H;
    }
    ctx.currentY += 4;
  }

  const sorted = [...layout.images].sort((a, b) => a.zIndex - b.zIndex);
  for (const item of sorted) {
    const imgData = await loadImage(item.src);
    if (!imgData) continue;
    if (item.borderWidth > 0) {
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b] as const;
      };
      const [br, bg, bb] = hexToRgb(item.borderColor || '#000000');
      pdf.setDrawColor(br, bg, bb);
      pdf.setLineWidth(item.borderWidth);
      pdf.rect(item.x - item.borderWidth / 2, item.y - item.borderWidth / 2, item.width + item.borderWidth, item.height + item.borderWidth, 'S');
    }
    try { pdf.addImage(imgData.data, 'JPEG', item.x, item.y, item.width, item.height); } catch (e) { console.warn('Layout image error:', e); }
    if (item.caption) {
      pdf.setFontSize(FONT_CAPTION);
      pdf.setFont('times', 'italic');
      pdf.setTextColor(0);
      const capX = item.x + item.width / 2;
      const capY = item.y + item.height + 4;
      const capLines: string[] = pdf.splitTextToSize(item.caption, item.width);
      for (let cl = 0; cl < Math.min(capLines.length, 2); cl++) {
        pdf.text(capLines[cl], capX, capY + cl * 4, { align: 'center' });
      }
    }
  }
  const maxBottom = Math.max(...sorted.map(i => i.y + i.height + (i.caption ? 10 : 0)));
  ctx.currentY = maxBottom + 4;
};
