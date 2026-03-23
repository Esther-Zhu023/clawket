import {
  computeSingleImageSize,
  computeMultiImageLayout,
  computeImageLayout,
  type ImageMeta,
} from './image-layout';

const CHAT_WIDTH = 375; // Typical iPhone width

describe('computeSingleImageSize', () => {
  const maxW = Math.round(CHAT_WIDTH * 0.72); // 270
  const maxH = Math.round(maxW * 1.4); // 378

  it('landscape image displays wide', () => {
    const result = computeSingleImageSize({ width: 1920, height: 1080 }, CHAT_WIDTH);
    expect(result.width).toBe(maxW);
    expect(result.height).toBeLessThan(result.width);
    expect(result.height).toBeGreaterThan(0);
  });

  it('portrait image displays tall', () => {
    const result = computeSingleImageSize({ width: 1080, height: 1920 }, CHAT_WIDTH);
    expect(result.height).toBeGreaterThan(result.width);
    expect(result.width).toBeGreaterThan(0);
  });

  it('square image is bounded by maxW', () => {
    const result = computeSingleImageSize({ width: 1000, height: 1000 }, CHAT_WIDTH);
    expect(result.width).toBeLessThanOrEqual(maxW);
    expect(result.height).toBeLessThanOrEqual(maxH);
    // Aspect ratio ~1 => width == height
    expect(result.width).toBe(result.height);
  });

  it('unknown dimensions (0×0) fallback to 4:3', () => {
    const result = computeSingleImageSize({ width: 0, height: 0 }, CHAT_WIDTH);
    expect(result.width).toBe(maxW);
    const expectedH = Math.round(maxW / (4 / 3));
    expect(result.height).toBe(expectedH);
  });

  it('extreme portrait ratio is clamped to 0.5', () => {
    const result = computeSingleImageSize({ width: 100, height: 2000 }, CHAT_WIDTH);
    // Clamped ratio = 0.5, so h = w / 0.5 = 2w, but clamped by maxH
    expect(result.height).toBeLessThanOrEqual(maxH);
    expect(result.width).toBeGreaterThan(0);
  });

  it('extreme landscape ratio is clamped to 1.5', () => {
    const result = computeSingleImageSize({ width: 3000, height: 100 }, CHAT_WIDTH);
    // Clamped ratio = 1.5
    expect(result.width).toBe(maxW);
    expect(result.height).toBe(Math.round(maxW / 1.5));
  });

  it('single pixel image falls back gracefully', () => {
    const result = computeSingleImageSize({ width: 1, height: 1 }, CHAT_WIDTH);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});

describe('computeMultiImageLayout', () => {
  it('2 images side by side', () => {
    const metas: ImageMeta[] = [
      { width: 800, height: 600 },
      { width: 600, height: 800 },
    ];
    const result = computeMultiImageLayout(metas, CHAT_WIDTH);
    expect(result.rects).toHaveLength(2);
    // Both in same row (same y)
    expect(result.rects[0].y).toBe(result.rects[1].y);
    // Landscape image should be wider
    expect(result.rects[0].width).toBeGreaterThan(result.rects[1].width);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  it('3 images produce valid layout', () => {
    const metas: ImageMeta[] = [
      { width: 1920, height: 1080 },
      { width: 1080, height: 1080 },
      { width: 1080, height: 1920 },
    ];
    const result = computeMultiImageLayout(metas, CHAT_WIDTH);
    expect(result.rects).toHaveLength(3);
    for (const rect of result.rects) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    }
  });

  it('4 images produce valid layout', () => {
    const metas: ImageMeta[] = Array.from({ length: 4 }, () => ({ width: 800, height: 600 }));
    const result = computeMultiImageLayout(metas, CHAT_WIDTH);
    expect(result.rects).toHaveLength(4);
    expect(result.totalHeight).toBeGreaterThan(0);
  });

  it('5+ images with mixed aspects', () => {
    const metas: ImageMeta[] = [
      { width: 2000, height: 1000 },
      { width: 1000, height: 2000 },
      { width: 1000, height: 1000 },
      { width: 1500, height: 1000 },
      { width: 800, height: 1200 },
    ];
    const result = computeMultiImageLayout(metas, CHAT_WIDTH);
    expect(result.rects).toHaveLength(5);
    for (const rect of result.rects) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('all same ratio produces uniform cells', () => {
    const metas: ImageMeta[] = Array.from({ length: 4 }, () => ({ width: 100, height: 100 }));
    const result = computeMultiImageLayout(metas, CHAT_WIDTH);
    const widths = result.rects.map((r) => r.width);
    const heights = result.rects.map((r) => r.height);
    // All heights in same row should be equal
    const firstRowRects = result.rects.filter((r) => r.y === result.rects[0].y);
    for (const r of firstRowRects) {
      expect(r.height).toBe(firstRowRects[0].height);
    }
  });

  it('zero dimension images use fallback', () => {
    const metas: ImageMeta[] = [
      { width: 0, height: 0 },
      { width: 0, height: 0 },
    ];
    const result = computeMultiImageLayout(metas, CHAT_WIDTH);
    expect(result.rects).toHaveLength(2);
    for (const rect of result.rects) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    }
  });
});

describe('computeImageLayout', () => {
  it('empty array returns single kind with 0 dimensions', () => {
    const result = computeImageLayout([], CHAT_WIDTH);
    expect(result.kind).toBe('single');
    if (result.kind === 'single') {
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    }
  });

  it('single image returns single kind', () => {
    const result = computeImageLayout([{ width: 800, height: 600 }], CHAT_WIDTH);
    expect(result.kind).toBe('single');
  });

  it('multiple images return grid kind', () => {
    const metas: ImageMeta[] = [
      { width: 800, height: 600 },
      { width: 600, height: 800 },
    ];
    const result = computeImageLayout(metas, CHAT_WIDTH);
    expect(result.kind).toBe('grid');
    if (result.kind === 'grid') {
      expect(result.rects).toHaveLength(2);
      expect(result.totalHeight).toBeGreaterThan(0);
    }
  });
});
