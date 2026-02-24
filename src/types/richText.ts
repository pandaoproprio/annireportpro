// ══════════════════════════════════════════════════════════════
// Structured Rich Text Model for Header/Footer
// ══════════════════════════════════════════════════════════════

// ── Inline node (leaf) ──
export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;       // pt override
  fontFamily?: string;     // override
}

// ── Variable node — resolved at render/export time ──
export interface RichTextVariable {
  type: 'variable';
  variable: 'pageNumber' | 'totalPages' | 'date' | 'documentTitle';
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

// ── Image node ──
export interface RichTextImage {
  type: 'image';
  src: string;
  width: number;   // mm
  height: number;  // mm
  position: 'left' | 'center' | 'right';
}

export type RichTextChild = RichTextSpan | RichTextVariable;

// ── Paragraph node ──
export interface RichTextParagraph {
  type: 'paragraph';
  align: 'left' | 'center' | 'right' | 'justify';
  children: RichTextChild[];
}

// ── Root content ──
export interface StructuredRichContent {
  type: 'richText';
  content: (RichTextParagraph | RichTextImage)[];
  height: number; // mm
}

// ── Defaults ──
export const createDefaultStructuredContent = (height = 20): StructuredRichContent => ({
  type: 'richText',
  content: [
    {
      type: 'paragraph',
      align: 'center',
      children: [{ text: '' }],
    },
  ],
  height,
});

// ── Variable label map ──
export const VARIABLE_LABELS: Record<RichTextVariable['variable'], string> = {
  pageNumber: 'Nº Página',
  totalPages: 'Total Páginas',
  date: 'Data Atual',
  documentTitle: 'Título do Documento',
};

// ── Resolve variables for display ──
export const resolveVariable = (
  variable: RichTextVariable['variable'],
  context: { pageNumber?: number; totalPages?: number; title?: string }
): string => {
  switch (variable) {
    case 'pageNumber': return String(context.pageNumber ?? '{{página}}');
    case 'totalPages': return String(context.totalPages ?? '{{total}}');
    case 'date': return new Date().toLocaleDateString('pt-BR');
    case 'documentTitle': return context.title ?? '{{título}}';
  }
};

// ── Convert structured content to HTML (for Tiptap / canvas preview) ──
export const structuredToHtml = (
  content: StructuredRichContent,
  context?: { pageNumber?: number; totalPages?: number; title?: string }
): string => {
  return content.content
    .filter((n): n is RichTextParagraph => n.type === 'paragraph')
    .map(para => {
      const inner = para.children
        .map(child => {
          if ('variable' in child && child.type === 'variable') {
            const resolved = resolveVariable(child.variable, context ?? {});
            let html = resolved;
            if (child.bold) html = `<strong>${html}</strong>`;
            if (child.italic) html = `<em>${html}</em>`;
            return `<span class="variable" data-variable="${child.variable}">${html}</span>`;
          }
          // Text span
          const span = child as RichTextSpan;
          let html = span.text;
          if (span.bold) html = `<strong>${html}</strong>`;
          if (span.italic) html = `<em>${html}</em>`;
          if (span.underline) html = `<u>${html}</u>`;
          return html;
        })
        .join('');
      return `<p style="text-align:${para.align}">${inner || '&nbsp;'}</p>`;
    })
    .join('');
};

// ── Convert HTML back to structured content ──
export const htmlToStructured = (html: string, height: number): StructuredRichContent => {
  // Simple parser: split by <p> tags
  const paragraphs: RichTextParagraph[] = [];
  const pRegex = /<p[^>]*(?:style="[^"]*text-align:\s*(left|center|right|justify)[^"]*")?[^>]*>(.*?)<\/p>/gi;
  let match;

  while ((match = pRegex.exec(html)) !== null) {
    const align = (match[1] as RichTextParagraph['align']) || 'center';
    const innerHtml = match[2];
    const children = parseInlineHtml(innerHtml);
    paragraphs.push({ type: 'paragraph', align, children });
  }

  // Fallback: if no <p> tags, treat as single paragraph
  if (paragraphs.length === 0 && html.trim()) {
    paragraphs.push({
      type: 'paragraph',
      align: 'center',
      children: parseInlineHtml(html),
    });
  }

  if (paragraphs.length === 0) {
    paragraphs.push({ type: 'paragraph', align: 'center', children: [{ text: '' }] });
  }

  return { type: 'richText', content: paragraphs, height };
};

function parseInlineHtml(html: string): RichTextChild[] {
  const children: RichTextChild[] = [];
  let bold = false, italic = false, underline = false;

  // Check for variable spans
  const varRegex = /<span[^>]*data-variable="([^"]+)"[^>]*>.*?<\/span>/gi;
  const parts = html.split(varRegex);

  // Simple approach: split by tags
  const tagParts = html.split(/(<\/?(?:strong|b|em|i|u|span)[^>]*>)/gi);

  for (const part of tagParts) {
    const lower = part.toLowerCase();
    if (lower === '<strong>' || lower === '<b>') { bold = true; continue; }
    if (lower === '</strong>' || lower === '</b>') { bold = false; continue; }
    if (lower === '<em>' || lower === '<i>') { italic = true; continue; }
    if (lower === '</em>' || lower === '</i>') { italic = false; continue; }
    if (lower === '<u>') { underline = true; continue; }
    if (lower === '</u>') { underline = false; continue; }
    if (lower.startsWith('<span') && lower.includes('data-variable')) {
      const varMatch = /data-variable="([^"]+)"/.exec(part);
      if (varMatch) {
        children.push({
          type: 'variable',
          variable: varMatch[1] as RichTextVariable['variable'],
          bold,
          italic,
        });
        continue;
      }
    }
    if (lower.startsWith('<') && lower.endsWith('>')) continue;

    const cleaned = part
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    if (cleaned) {
      children.push({ text: cleaned, bold, italic, underline });
    }
  }

  return children.length > 0 ? children : [{ text: '' }];
}
