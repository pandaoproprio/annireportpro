import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import {
  DocumentModel,
  DocumentBlock,
  TextBlock,
  ImageBlock,
  TableBlock,
  SpacerBlock,
  HeaderFooterConfig,
  LayoutConfig,
} from '@/types/document';
import {
  StructuredRichContent,
  RichTextParagraph,
  RichTextSpan,
  RichTextVariable,
  resolveVariable,
} from '@/types/richText';

// ── Font registration ──
Font.register({
  family: 'Times New Roman',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman.ttf', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman Italic.ttf', fontStyle: 'italic' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman Bold Italic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// mm → pt conversion (1mm ≈ 2.835pt)
const mm = (v: number) => v * 2.835;

// ── Strip HTML tags for plain text rendering ──
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

// ── Parse simple HTML into styled segments ──
interface StyledSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

const parseHtmlToSegments = (html: string): StyledSegment[] => {
  if (!html) return [{ text: '', bold: false, italic: false, underline: false }];

  const segments: StyledSegment[] = [];
  let bold = false;
  let italic = false;
  let underline = false;

  // Simple regex-based parser
  const parts = html.split(/(<\/?(?:strong|b|em|i|u|br|p)[^>]*>)/gi);

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === '<strong>' || lower === '<b>') { bold = true; continue; }
    if (lower === '</strong>' || lower === '</b>') { bold = false; continue; }
    if (lower === '<em>' || lower === '<i>') { italic = true; continue; }
    if (lower === '</em>' || lower === '</i>') { italic = false; continue; }
    if (lower === '<u>') { underline = true; continue; }
    if (lower === '</u>') { underline = false; continue; }
    if (lower.startsWith('<br')) { segments.push({ text: '\n', bold, italic, underline }); continue; }
    if (lower.startsWith('<p') || lower === '</p>') continue;

    const cleaned = part.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    if (cleaned) {
      segments.push({ text: cleaned, bold, italic, underline });
    }
  }

  return segments.length > 0 ? segments : [{ text: '', bold: false, italic: false, underline: false }];
};

// ── Resolve font family ──
const resolveFont = (family: string) => {
  const map: Record<string, string> = {
    'Times New Roman': 'Times New Roman',
    'Arial': 'Helvetica',
    'Helvetica': 'Helvetica',
    'Courier New': 'Courier',
    'Courier': 'Courier',
  };
  return map[family] || 'Times New Roman';
};

// ── Block Renderers ──
const TextBlockView: React.FC<{ block: TextBlock }> = ({ block }) => {
  const segments = parseHtmlToSegments(block.content);
  const fontFamily = resolveFont(block.fontFamily);

  return (
    <View
      style={{
        marginTop: mm(block.marginTop),
        marginBottom: mm(block.marginBottom),
        padding: mm(block.padding),
        width: `${block.width}%`,
        alignSelf: block.alignment === 'center' ? 'center' : block.alignment === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: block.fontSize,
          fontFamily,
          lineHeight: block.lineHeight,
          color: block.color,
          textAlign: block.alignment,
          textDecoration: block.underline ? 'underline' : 'none',
        }}
      >
        {segments.map((seg, i) => (
          <Text
            key={i}
            style={{
              fontWeight: seg.bold || block.bold ? 'bold' : 'normal',
              fontStyle: seg.italic || block.italic ? 'italic' : 'normal',
              textDecoration: seg.underline || block.underline ? 'underline' : 'none',
            }}
          >
            {seg.text}
          </Text>
        ))}
      </Text>
    </View>
  );
};

const ImageBlockView: React.FC<{ block: ImageBlock }> = ({ block }) => {
  if (!block.src) return null;

  return (
    <View
      style={{
        marginTop: mm(block.marginTop),
        marginBottom: mm(block.marginBottom),
        padding: mm(block.padding),
        width: `${block.width}%`,
        alignSelf: block.alignment === 'center' ? 'center' : block.alignment === 'right' ? 'flex-end' : 'flex-start',
        alignItems: block.alignment === 'center' ? 'center' : block.alignment === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <Image
        src={block.src}
        style={{
          width: mm(block.displayWidth),
          height: mm(block.displayHeight),
          objectFit: 'contain',
          ...(block.borderWidth > 0 ? {
            border: `${block.borderWidth}pt solid ${block.borderColor}`,
          } : {}),
        }}
      />
      {block.caption && (
        <Text style={{ fontSize: 9, color: '#666', marginTop: 4, textAlign: 'center' }}>
          {block.caption}
        </Text>
      )}
    </View>
  );
};

const TableBlockView: React.FC<{ block: TableBlock }> = ({ block }) => {
  const borderStyle = block.borderWidth > 0 ? `${block.borderWidth}pt solid ${block.borderColor}` : '0.5pt solid #999';

  return (
    <View
      style={{
        marginTop: mm(block.marginTop),
        marginBottom: mm(block.marginBottom),
        padding: mm(block.padding),
        width: `${block.width}%`,
        alignSelf: block.alignment === 'center' ? 'center' : block.alignment === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {block.data.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={{
                width: `${block.colWidths[ci] || (100 / block.cols)}%`,
                borderTop: borderStyle,
                borderLeft: borderStyle,
                borderRight: ci === row.length - 1 ? borderStyle : 'none',
                borderBottom: ri === block.data.length - 1 ? borderStyle : 'none',
                padding: 4,
                backgroundColor: block.headerRow && ri === 0 ? '#f0f0f0' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: block.headerRow && ri === 0 ? 'bold' : 'normal',
                  fontFamily: 'Times New Roman',
                }}
              >
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const SpacerBlockView: React.FC<{ block: SpacerBlock }> = ({ block }) => (
  <View
    style={{
      marginTop: mm(block.marginTop),
      marginBottom: mm(block.marginBottom),
      height: mm(block.height),
    }}
  />
);

const BlockView: React.FC<{ block: DocumentBlock }> = ({ block }) => {
  switch (block.type) {
    case 'text': return <TextBlockView block={block} />;
    case 'image': return <ImageBlockView block={block} />;
    case 'table': return <TableBlockView block={block} />;
    case 'spacer': return <SpacerBlockView block={block} />;
    default: return null;
  }
};

// ── Structured Rich Text Renderer for PDF ──
const StructuredContentView: React.FC<{
  content: StructuredRichContent;
  config: HeaderFooterConfig;
  context: { pageNumber?: number; totalPages?: number; title?: string };
}> = ({ content, config, context }) => {
  return (
    <View>
      {content.content.map((node, i) => {
        if (node.type === 'paragraph') {
          const para = node as RichTextParagraph;
          return (
            <Text key={i} style={{ textAlign: para.align, fontSize: config.fontSize, fontFamily: resolveFont(config.fontFamily) }}>
              {para.children.map((child, j) => {
                if ('variable' in child && child.type === 'variable') {
                  const varChild = child as RichTextVariable;
                  return (
                    <Text key={j} style={{ fontWeight: varChild.bold ? 'bold' : 'normal', fontStyle: varChild.italic ? 'italic' : 'normal' }}>
                      {resolveVariable(varChild.variable, context)}
                    </Text>
                  );
                }
                const span = child as RichTextSpan;
                return (
                  <Text key={j} style={{
                    fontWeight: span.bold ? 'bold' : 'normal',
                    fontStyle: span.italic ? 'italic' : 'normal',
                    textDecoration: span.underline ? 'underline' : 'none',
                    ...(span.color ? { color: span.color } : {}),
                    ...(span.fontSize ? { fontSize: span.fontSize } : {}),
                  }}>
                    {span.text}
                  </Text>
                );
              })}
            </Text>
          );
        }
        if (node.type === 'image') {
          return <Image key={i} src={node.src} style={{ width: mm(node.width), height: mm(node.height), objectFit: 'contain' }} />;
        }
        return null;
      })}
    </View>
  );
};

// ── Header/Footer Renderer ──
const HeaderFooterView: React.FC<{
  config: HeaderFooterConfig;
  layout: LayoutConfig;
  isHeader: boolean;
  pageIndex: number;
  totalPages: number;
  title: string;
}> = ({ config, layout, isHeader, pageIndex, totalPages, title }) => {
  if (!config.enabled) return null;

  const context = { pageNumber: pageIndex + 1, totalPages, title };

  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: isHeader ? 0 : undefined,
        bottom: isHeader ? undefined : 0,
        left: 0,
        right: 0,
        height: mm(config.height + (isHeader ? layout.marginTop : layout.marginBottom)),
        paddingLeft: mm(layout.marginLeft),
        paddingRight: mm(layout.marginRight),
        paddingTop: isHeader ? mm(layout.marginTop * 0.3) : mm(2),
        justifyContent: 'center',
        alignItems: config.alignment === 'center' ? 'center' : config.alignment === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {config.imageUrl ? (
        <Image
          src={config.imageUrl}
          style={{ maxHeight: mm(config.height * 0.9), objectFit: 'contain' }}
        />
      ) : config.structuredContent ? (
        <StructuredContentView content={config.structuredContent} config={config} context={context} />
      ) : stripHtml(config.content) ? (
        <Text
          style={{
            fontSize: config.fontSize,
            fontFamily: resolveFont(config.fontFamily),
            textAlign: config.alignment,
          }}
        >
          {stripHtml(config.content)}
        </Text>
      ) : null}
    </View>
  );
};

// ── Main PDF Document Component ──
const PdfDocument: React.FC<{ model: DocumentModel; title: string }> = ({ model, title }) => {
  const { layout, globalHeader, globalFooter } = model;

  return (
    <Document>
      {model.pages.map((page, pi) => {
        const header = page.header ?? globalHeader;
        const footer = page.footer ?? globalFooter;

        return (
          <Page
            key={page.id}
            size="A4"
            style={{
              paddingTop: mm(layout.marginTop + (header.enabled ? header.height + layout.headerSpacing : 0)),
              paddingBottom: mm(layout.marginBottom + (footer.enabled ? footer.height + layout.footerSpacing : 0)),
              paddingLeft: mm(layout.marginLeft),
              paddingRight: mm(layout.marginRight),
              fontFamily: 'Times New Roman',
              fontSize: 12,
            }}
          >
            <HeaderFooterView config={header} layout={layout} isHeader={true} pageIndex={pi} totalPages={model.pages.length} title={title} />

            {page.blocks.map(block => (
              <BlockView key={block.id} block={block} />
            ))}

            <HeaderFooterView config={footer} layout={layout} isHeader={false} pageIndex={pi} totalPages={model.pages.length} title={title} />

            {/* Page number */}
            <Text
              fixed
              style={{
                position: 'absolute',
                bottom: mm(layout.marginBottom * 0.3),
                right: mm(layout.marginRight),
                fontSize: 9,
                color: '#999',
              }}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </Page>
        );
      })}
    </Document>
  );
};

// ── Export function ──
export const generatePdf = async (model: DocumentModel, title: string) => {
  const blob = await pdf(<PdfDocument model={model} title={title} />).toBlob();
  const filename = `${title.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').trim() || 'documento'}.pdf`;
  saveAs(blob, filename);
};
