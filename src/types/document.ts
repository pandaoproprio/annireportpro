// ══════════════════════════════════════════════════════════════
// Enterprise Document Editor — Structured Document Model
// ══════════════════════════════════════════════════════════════

// ── Block Types ──
export type BlockType = 'text' | 'image' | 'table' | 'spacer';

export interface BlockBase {
  id: string;
  type: BlockType;
  marginTop: number;    // mm
  marginBottom: number;  // mm
  padding: number;       // mm
  alignment: 'left' | 'center' | 'right' | 'justify';
  width: number;         // percentage (0-100)
}

export interface TextBlock extends BlockBase {
  type: 'text';
  content: string;       // HTML from rich text editor
  fontSize: number;      // pt
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  lineHeight: number;    // multiplier (e.g. 1.5)
  color: string;         // hex
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;           // storage URL
  originalWidth: number; // px
  originalHeight: number;// px
  displayWidth: number;  // mm
  displayHeight: number; // mm
  lockAspectRatio: boolean;
  caption: string;
  borderWidth: number;
  borderColor: string;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  rows: number;
  cols: number;
  data: string[][];      // [row][col] cell content
  colWidths: number[];   // percentage per column
  headerRow: boolean;
  borderColor: string;
  borderWidth: number;
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  height: number;        // mm
}

export type DocumentBlock = TextBlock | ImageBlock | TableBlock | SpacerBlock;

// ── Header / Footer ──
export interface HeaderFooterConfig {
  enabled: boolean;
  content: string;       // HTML rich text
  height: number;        // mm
  alignment: 'left' | 'center' | 'right';
  fontSize: number;
  fontFamily: string;
  imageUrl?: string;     // optional logo/banner
  imageWidth?: number;
  imageHeight?: number;
  imagePosition?: 'left' | 'center' | 'right';
}

// ── Page ──
export interface DocumentPage {
  id: string;
  header: HeaderFooterConfig | null;   // null = use global
  footer: HeaderFooterConfig | null;   // null = use global
  blocks: DocumentBlock[];
}

// ── Layout Config ──
export interface LayoutConfig {
  marginTop: number;     // mm
  marginBottom: number;  // mm
  marginLeft: number;    // mm
  marginRight: number;   // mm
  headerSpacing: number; // mm — gap between header and content
  footerSpacing: number; // mm — gap between content and footer
  pageWidth: number;     // mm (default 210 for A4)
  pageHeight: number;    // mm (default 297 for A4)
}

// ── Full Document Model ──
export interface DocumentModel {
  pages: DocumentPage[];
  globalHeader: HeaderFooterConfig;
  globalFooter: HeaderFooterConfig;
  layout: LayoutConfig;
}

// ── Database Row ──
export interface DocumentRow {
  id: string;
  project_id: string;
  title: string;
  content: DocumentModel;
  layout_config: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersionRow {
  id: string;
  document_id: string;
  version_number: number;
  content_snapshot: DocumentModel;
  created_at: string;
}

// ── Defaults ──
export const DEFAULT_LAYOUT: LayoutConfig = {
  marginTop: 30,
  marginBottom: 20,
  marginLeft: 30,
  marginRight: 20,
  headerSpacing: 8,
  footerSpacing: 8,
  pageWidth: 210,
  pageHeight: 297,
};

export const DEFAULT_HEADER_FOOTER: HeaderFooterConfig = {
  enabled: false,
  content: '',
  height: 20,
  alignment: 'center',
  fontSize: 10,
  fontFamily: 'Times New Roman',
};

export const createDefaultTextBlock = (id: string): TextBlock => ({
  id,
  type: 'text',
  marginTop: 0,
  marginBottom: 4,
  padding: 0,
  alignment: 'justify',
  width: 100,
  content: '',
  fontSize: 12,
  fontFamily: 'Times New Roman',
  bold: false,
  italic: false,
  underline: false,
  lineHeight: 1.5,
  color: '#000000',
});

export const createDefaultImageBlock = (id: string): ImageBlock => ({
  id,
  type: 'image',
  marginTop: 4,
  marginBottom: 4,
  padding: 0,
  alignment: 'center',
  width: 80,
  src: '',
  originalWidth: 0,
  originalHeight: 0,
  displayWidth: 120,
  displayHeight: 80,
  lockAspectRatio: true,
  caption: '',
  borderWidth: 0,
  borderColor: '#000000',
});

export const createDefaultSpacerBlock = (id: string): SpacerBlock => ({
  id,
  type: 'spacer',
  marginTop: 0,
  marginBottom: 0,
  padding: 0,
  alignment: 'center',
  width: 100,
  height: 10,
});

export const createDefaultDocument = (): DocumentModel => ({
  pages: [{
    id: crypto.randomUUID(),
    header: null,
    footer: null,
    blocks: [],
  }],
  globalHeader: { ...DEFAULT_HEADER_FOOTER },
  globalFooter: { ...DEFAULT_HEADER_FOOTER },
  layout: { ...DEFAULT_LAYOUT },
});
