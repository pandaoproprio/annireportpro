// Layout types for the advanced image editor (positions in mm, compatible with jsPDF)

export type GridType = '1x1' | '2x1' | '1x2' | '2x2' | '3x2' | '2x3' | '3x3' | 'custom';

export interface ImageLayoutItem {
  id: string;
  src: string;
  x: number;       // mm from left
  y: number;       // mm from top
  width: number;   // mm
  height: number;  // mm
  rotation: number; // degrees
  caption: string;
  zIndex: number;
}

export interface PageLayout {
  gridType: GridType;
  gap: number;       // mm between images
  autoFit: boolean;
  images: ImageLayoutItem[];
}

// ABNT page constants in mm
export const ABNT = {
  PAGE_W: 210,
  PAGE_H: 297,
  MARGIN_TOP: 30,
  MARGIN_BOTTOM: 20,
  MARGIN_LEFT: 30,
  MARGIN_RIGHT: 20,
  get CONTENT_W() { return this.PAGE_W - this.MARGIN_LEFT - this.MARGIN_RIGHT; },  // 160mm
  get CONTENT_H() { return this.PAGE_H - this.MARGIN_TOP - this.MARGIN_BOTTOM; },  // 247mm
} as const;

// Conversion helpers (screen scale factor)
export const mmToPx = (mm: number, scale: number) => mm * scale;
export const pxToMm = (px: number, scale: number) => px / scale;

// Grid configurations: how many columns x rows
export const GRID_CONFIGS: Record<GridType, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '2x1': { cols: 2, rows: 1 },
  '1x2': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  '3x2': { cols: 3, rows: 2 },
  '2x3': { cols: 2, rows: 3 },
  '3x3': { cols: 3, rows: 3 },
  'custom': { cols: 1, rows: 1 },
};

/** Generate auto-layout positions for images in a grid */
export const generateGridLayout = (
  photos: string[],
  gridType: GridType,
  gap: number = 5,
): ImageLayoutItem[] => {
  const { cols, rows } = GRID_CONFIGS[gridType];
  const contentW = ABNT.PAGE_W - ABNT.MARGIN_LEFT - ABNT.MARGIN_RIGHT; // 160
  const contentH = ABNT.PAGE_H - ABNT.MARGIN_TOP - ABNT.MARGIN_BOTTOM; // 247

  const totalGapX = (cols - 1) * gap;
  const totalGapY = (rows - 1) * gap;
  const cellW = (contentW - totalGapX) / cols;
  const cellH = Math.min((contentH - totalGapY) / rows, cellW * 0.75); // max aspect 4:3

  return photos.slice(0, cols * rows).map((src, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: `img_${i}_${Date.now()}`,
      src,
      x: ABNT.MARGIN_LEFT + col * (cellW + gap),
      y: ABNT.MARGIN_TOP + row * (cellH + gap),
      width: cellW,
      height: cellH,
      rotation: 0,
      caption: '',
      zIndex: i,
    };
  });
};
