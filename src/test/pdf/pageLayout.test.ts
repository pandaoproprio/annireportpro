import { describe, it, expect } from 'vitest';
import { createPdfContext, getContentStartY, ensureSpace } from '@/lib/pdf/pageLayout';
import { MT, MAX_Y, HEADER_TOP_Y, HEADER_BANNER_H, HEADER_LOGO_H } from '@/lib/pdf/constants';
import type { PreloadedImage } from '@/lib/pdf/constants';

const mockImage: PreloadedImage = { data: 'data:image/png;base64,abc', width: 200, height: 100 };

describe('pdf/pageLayout', () => {
  describe('createPdfContext', () => {
    it('creates a context with default values', () => {
      const ctx = createPdfContext();
      expect(ctx.currentY).toBe(MT);
      expect(ctx.pageCount).toBe(1);
      expect(ctx.pdf).toBeDefined();
    });
  });

  describe('getContentStartY', () => {
    it('returns MT when no header config', () => {
      const ctx = createPdfContext();
      expect(getContentStartY(ctx)).toBe(MT);
    });

    it('accounts for banner image', () => {
      const ctx = createPdfContext();
      ctx.headerConfig = { bannerImg: mockImage, bannerHeightMm: 30, bannerVisible: true };
      const y = getContentStartY(ctx);
      const expected = HEADER_TOP_Y + 30 + 4;
      expect(y).toBe(expected);
    });

    it('accounts for logo images', () => {
      const ctx = createPdfContext();
      ctx.headerConfig = { logoImg: mockImage, logoVisible: true };
      const y = getContentStartY(ctx);
      expect(y).toBeGreaterThan(MT);
    });

    it('returns MT when all logos are hidden', () => {
      const ctx = createPdfContext();
      ctx.headerConfig = { logoImg: mockImage, logoVisible: false };
      const y = getContentStartY(ctx);
      expect(y).toBe(MT);
    });

    it('returns MT on later pages when header is only for the first content page', () => {
      const ctx = createPdfContext();
      ctx.headerConfig = { logoImg: mockImage, logoVisible: true, renderMode: 'first-page' };
      const y = getContentStartY(ctx, 3);
      expect(y).toBe(MT);
    });
  });

  describe('ensureSpace', () => {
    it('adds page when not enough space', () => {
      const ctx = createPdfContext();
      ctx.currentY = MAX_Y - 5;
      ensureSpace(ctx, 10);
      expect(ctx.pageCount).toBe(2);
    });

    it('does not add page when space is sufficient', () => {
      const ctx = createPdfContext();
      ctx.currentY = MT;
      ensureSpace(ctx, 10);
      expect(ctx.pageCount).toBe(1);
    });
  });
});
