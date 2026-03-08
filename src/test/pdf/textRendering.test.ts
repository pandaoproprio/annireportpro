import { describe, it, expect, beforeEach } from 'vitest';
import { parseHtmlToBlocks } from '@/lib/pdf/textRendering';

describe('parseHtmlToBlocks', () => {
  it('returns empty array for empty/falsy input', () => {
    expect(parseHtmlToBlocks('')).toEqual([]);
    expect(parseHtmlToBlocks(undefined as any)).toEqual([]);
  });

  it('parses plain text as a paragraph', () => {
    const blocks = parseHtmlToBlocks('Hello world');
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].content).toBe('Hello world');
  });

  it('parses a <p> tag as paragraph', () => {
    const blocks = parseHtmlToBlocks('<p>Parágrafo simples</p>');
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].content).toBe('Parágrafo simples');
  });

  it('parses multiple paragraphs', () => {
    const blocks = parseHtmlToBlocks('<p>First</p><p>Second</p>');
    expect(blocks.length).toBe(2);
    expect(blocks[0].content).toBe('First');
    expect(blocks[1].content).toBe('Second');
  });

  it('parses empty paragraph with no crash', () => {
    const blocks = parseHtmlToBlocks('<p></p>');
    expect(blocks.length).toBe(1);
    expect(blocks[0].content).toBe('');
  });

  it('parses <ul> list items as bullet blocks', () => {
    const blocks = parseHtmlToBlocks('<ul><li>Item A</li><li>Item B</li></ul>');
    const bullets = blocks.filter(b => b.type === 'bullet');
    expect(bullets.length).toBe(2);
    expect(bullets[0].content).toBe('Item A');
    expect(bullets[1].content).toBe('Item B');
  });

  it('parses <ol> list items as bullet blocks', () => {
    const blocks = parseHtmlToBlocks('<ol><li>One</li><li>Two</li></ol>');
    const bullets = blocks.filter(b => b.type === 'bullet');
    expect(bullets.length).toBe(2);
  });

  it('extracts bold segments from <strong> tags', () => {
    const blocks = parseHtmlToBlocks('<p><strong>Bold</strong> normal</p>');
    expect(blocks[0].segments).toBeDefined();
    const boldSeg = blocks[0].segments!.find(s => s.bold);
    expect(boldSeg).toBeDefined();
    expect(boldSeg!.text).toBe('Bold');
  });

  it('extracts italic segments from <em> tags', () => {
    const blocks = parseHtmlToBlocks('<p><em>Italic</em> text</p>');
    const italicSeg = blocks[0].segments!.find(s => s.italic);
    expect(italicSeg).toBeDefined();
    expect(italicSeg!.text).toBe('Italic');
  });

  it('extracts underline segments from <u> tags', () => {
    const blocks = parseHtmlToBlocks('<p><u>Underlined</u></p>');
    const ulSeg = blocks[0].segments!.find(s => s.underline);
    expect(ulSeg).toBeDefined();
    expect(ulSeg!.text).toBe('Underlined');
  });

  it('handles nested formatting: bold + italic', () => {
    const blocks = parseHtmlToBlocks('<p><strong><em>BoldItalic</em></strong></p>');
    const seg = blocks[0].segments![0];
    expect(seg.bold).toBe(true);
    expect(seg.italic).toBe(true);
  });

  it('parses heading tags (h1-h6) as heading blocks', () => {
    const blocks = parseHtmlToBlocks('<h2>Title</h2>');
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].content).toBe('Title');
  });

  it('parses standalone <img> as image block', () => {
    const blocks = parseHtmlToBlocks('<img src="https://example.com/photo.jpg" alt="Test" />');
    const img = blocks.find(b => b.type === 'image');
    expect(img).toBeDefined();
    expect(img!.imageSrc).toBe('https://example.com/photo.jpg');
  });

  it('parses <img> inside <p> as image block', () => {
    const blocks = parseHtmlToBlocks('<p><img src="https://example.com/photo.jpg" data-caption="Caption" /></p>');
    const img = blocks.find(b => b.type === 'image');
    expect(img).toBeDefined();
    expect(img!.imageCaption).toBe('Caption');
  });

  it('parses gallery div with data-gallery attribute', () => {
    const images = JSON.stringify([{ src: 'a.jpg', caption: 'A' }, { src: 'b.jpg', caption: 'B' }]);
    const html = `<div data-gallery="true" data-images='${images}' data-columns="3"></div>`;
    const blocks = parseHtmlToBlocks(html);
    const gallery = blocks.find(b => b.type === 'gallery');
    expect(gallery).toBeDefined();
    expect(gallery!.galleryImages!.length).toBe(2);
    expect(gallery!.galleryColumns).toBe(3);
  });

  it('handles complex mixed HTML', () => {
    const html = `
      <h2>Resumo</h2>
      <p>Texto <strong>importante</strong> do relatório.</p>
      <ul>
        <li>Ponto 1</li>
        <li>Ponto 2</li>
      </ul>
      <p>Final.</p>
    `;
    const blocks = parseHtmlToBlocks(html);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    expect(blocks[0].type).toBe('heading');
    const bullets = blocks.filter(b => b.type === 'bullet');
    expect(bullets.length).toBe(2);
  });
});
