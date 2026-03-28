import { describe, it, expect, vi } from 'vitest';
import { addPhotoGrid } from '@/lib/pdf/imageHelpers';
import { ML, CW, MT } from '@/lib/pdf/constants';
import type { PdfContext } from '@/lib/pdf/pageLayout';

const createMockPdf = () => {
  const text = vi.fn();
  const rect = vi.fn();
  const addImage = vi.fn();
  return {
    text,
    rect,
    addImage,
    addPage: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    splitTextToSize: vi.fn((value: string) => [value]),
    getTextWidth: vi.fn((value: string) => value.length * 2),
  };
};

describe('pdf/imageHelpers addPhotoGrid', () => {
  it('organiza fotos em grade 3x2 e centraliza a última foto ímpar na página seguinte', async () => {
    const pdf = createMockPdf();
    const ctx: PdfContext = { pdf: pdf as never, currentY: MT, pageCount: 1 };
    const imageLoader = vi.fn().mockResolvedValue({ data: 'data:image/jpeg;base64,abc', width: 800, height: 600 });
    const photos = ['1', '2', '3', '4', '5', '6', '7'];

    await addPhotoGrid(ctx, photos, 'Teste', photos.map((p) => `Foto ${p}`), undefined, imageLoader);

    expect(ctx.pageCount).toBe(2);
    expect(pdf.addImage).toHaveBeenCalledTimes(7);

    const photoW = (CW - 16) / 3;
    const centeredX = ML + (CW - photoW) / 2;
    const secondPageCenteredRect = pdf.rect.mock.calls.find(
      ([x, , width]) => Math.abs(Number(x) - centeredX) < 0.01 && Math.abs(Number(width) - photoW) < 0.01,
    );

    expect(secondPageCenteredRect).toBeTruthy();
  });
});