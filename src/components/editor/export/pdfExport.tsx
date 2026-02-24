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

// ── Header/Footer Renderer ──
const HeaderFooterView: React.FC<{
  config: HeaderFooterConfig;
  layout: LayoutConfig;
  isHeader: boolean;
}> = ({ config, layout, isHeader }) => {
  if (!config.enabled) return null;

  const plainText = stripHtml(config.content);

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
          style={{
            maxHeight: mm(config.height * 0.9),
            objectFit: 'contain',
          }}
        />
      ) : plainText ? (
        <Text
          style={{
            fontSize: config.fontSize,
            fontFamily: resolveFont(config.fontFamily),
            textAlign: config.alignment,
          }}
        >
          {plainText}
        </Text>
      ) : null}
    </View>
  );
};

// ── Main PDF Document Component ──
const PdfDocument: React.FC<{ model: DocumentModel }> = ({ model }) => {
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
            <HeaderFooterView config={header} layout={layout} isHeader={true} />

            {page.blocks.map(block => (
              <BlockView key={block.id} block={block} />
            ))}

            <HeaderFooterView config={footer} layout={layout} isHeader={false} />

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
  const blob = await pdf(<PdfDocument model={model} />).toBlob();
  const filename = `${title.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').trim() || 'documento'}.pdf`;
  saveAs(blob, filename);
};
