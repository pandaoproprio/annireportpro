import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  PAGE_W, PAGE_H, ML, MR, MT, MB, CW, MAX_Y, LINE_H,
  INDENT, FONT_BODY, FONT_CAPTION,
  HEADER_BANNER_H, HEADER_LOGO_H, HEADER_TOP_Y,
} from '@/lib/pdf/constants';

describe('pdf/constants', () => {
  describe('sanitizeText', () => {
    it('removes zero-width spaces', () => {
      expect(sanitizeText('hello\u200Bworld')).toBe('helloworld');
    });

    it('removes BOM characters', () => {
      expect(sanitizeText('\uFEFFtext')).toBe('text');
    });

    it('removes soft hyphens', () => {
      expect(sanitizeText('some\u00ADtext')).toBe('sometext');
    });

    it('removes multiple invisible chars', () => {
      expect(sanitizeText('\u200B\u200C\u200D\uFEFF\u200E\u200F\u2060\u00AD')).toBe('');
    });

    it('preserves normal text', () => {
      expect(sanitizeText('Hello World 123')).toBe('Hello World 123');
    });

    it('preserves accented characters', () => {
      expect(sanitizeText('São Paulo — ação')).toBe('São Paulo — ação');
    });
  });

  describe('ABNT constants', () => {
    it('has correct A4 dimensions', () => {
      expect(PAGE_W).toBe(210);
      expect(PAGE_H).toBe(297);
    });

    it('has correct margins (3cm top/left, 2cm bottom/right)', () => {
      expect(ML).toBe(30);
      expect(MR).toBe(20);
      expect(MT).toBe(30);
      expect(MB).toBe(20);
    });

    it('calculates content width correctly', () => {
      expect(CW).toBe(PAGE_W - ML - MR);
      expect(CW).toBe(160);
    });

    it('has correct line height for 1.5 spacing', () => {
      expect(LINE_H).toBe(7.2);
    });

    it('has ABNT paragraph indent of 1.25cm', () => {
      expect(INDENT).toBe(12.5);
    });

    it('has correct font sizes', () => {
      expect(FONT_BODY).toBe(12);
      expect(FONT_CAPTION).toBe(10);
    });

    it('MAX_Y leaves room for footer', () => {
      expect(MAX_Y).toBe(PAGE_H - MB - 4);
      expect(MAX_Y).toBe(273);
    });
  });
});
