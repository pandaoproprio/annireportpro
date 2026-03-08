import { describe, it, expect, vi } from 'vitest';
import { buildHeaderConfig } from '@/lib/pdf/headerFooter';
import type { PreloadedImage } from '@/lib/pdf/constants';

const mockImage: PreloadedImage = { data: 'data:image/png;base64,abc', width: 200, height: 100 };

describe('pdf/headerFooter', () => {
  describe('buildHeaderConfig', () => {
    it('returns undefined when vc is undefined', () => {
      expect(buildHeaderConfig(undefined, {})).toBeUndefined();
    });

    it('returns undefined when no images provided', () => {
      const vc = { headerBannerHeightMm: 30 };
      expect(buildHeaderConfig(vc, {})).toBeUndefined();
    });

    it('returns config when banner image is provided', () => {
      const vc = { headerBannerHeightMm: 25, headerBannerVisible: true };
      const result = buildHeaderConfig(vc, { bannerImg: mockImage });
      expect(result).toBeDefined();
      expect(result!.bannerImg).toBe(mockImage);
      expect(result!.bannerHeightMm).toBe(25);
      expect(result!.bannerVisible).toBe(true);
    });

    it('returns config when logo image is provided', () => {
      const vc = {
        logoConfig: { visible: true, widthMm: 20 },
        headerLogoAlignment: 'center' as const,
        headerLogoGap: 5,
      };
      const result = buildHeaderConfig(vc, { logoImg: mockImage });
      expect(result).toBeDefined();
      expect(result!.logoImg).toBe(mockImage);
      expect(result!.logoVisible).toBe(true);
      expect(result!.logoWidthMm).toBe(20);
      expect(result!.logoAlignment).toBe('center');
    });

    it('maps all visual config fields', () => {
      const vc = {
        headerBannerHeightMm: 30,
        headerBannerFit: 'cover' as const,
        headerBannerVisible: false,
        headerLeftText: 'Left',
        headerRightText: 'Right',
        logoConfig: { visible: true, widthMm: 15 },
        logoCenterConfig: { visible: false, widthMm: 18 },
        logoSecondaryConfig: { visible: true, widthMm: 12 },
        headerLogoAlignment: 'space-between' as const,
        headerLogoGap: 10,
        headerTopPadding: 8,
        headerHeight: 25,
        headerContentSpacing: 12,
      };
      const result = buildHeaderConfig(vc, {
        bannerImg: mockImage, logoImg: mockImage,
        logoCenterImg: mockImage, logoSecondaryImg: mockImage,
      });
      expect(result).toBeDefined();
      expect(result!.bannerFit).toBe('cover');
      expect(result!.headerLeftText).toBe('Left');
      expect(result!.headerRightText).toBe('Right');
      expect(result!.logoCenterVisible).toBe(false);
      expect(result!.logoSecondaryWidthMm).toBe(12);
      expect(result!.topPaddingMm).toBe(8);
      expect(result!.headerHeightMm).toBe(25);
      expect(result!.contentSpacingMm).toBe(12);
    });
  });
});
