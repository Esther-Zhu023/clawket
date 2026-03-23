/**
 * Telegram-style image layout algorithm.
 *
 * Pure functions — zero React / RN dependencies.
 * Computes pixel-perfect sizes for single images and
 * row-packed grids for multi-image messages.
 */

export type ImageMeta = { width: number; height: number };

export type LayoutRect = { x: number; y: number; width: number; height: number };

export type ImageLayout =
  | { kind: 'single'; width: number; height: number }
  | { kind: 'grid'; totalWidth: number; totalHeight: number; rects: LayoutRect[] };

const GAP = 3;

// ─── Single image ────────────────────────────────────────────

/**
 * Compute display size for a single image.
 *
 * Max bounding box: width = chatWidth × 0.72, height = maxW × 1.4.
 * Clamp original aspect ratio to [0.5, 1.5].
 * Unknown dimensions (0×0) → fallback 4:3.
 */
export function computeSingleImageSize(
  meta: ImageMeta,
  chatWidth: number,
): { width: number; height: number } {
  const maxW = Math.round(chatWidth * 0.72);
  const maxH = Math.round(maxW * 1.4);

  let ratio: number;
  if (meta.width > 0 && meta.height > 0) {
    ratio = meta.width / meta.height;
    // Clamp to [0.5, 1.5] to prevent extreme shapes
    ratio = Math.max(0.5, Math.min(1.5, ratio));
  } else {
    // Unknown → fallback 4:3
    ratio = 4 / 3;
  }

  // Fit within bounding box (aspect-fit)
  let w: number;
  let h: number;
  if (ratio >= maxW / maxH) {
    // Width-constrained
    w = maxW;
    h = Math.round(maxW / ratio);
  } else {
    // Height-constrained
    h = maxH;
    w = Math.round(maxH * ratio);
  }

  // Ensure we don't exceed bounds (rounding safety)
  w = Math.min(w, maxW);
  h = Math.min(h, maxH);

  return { width: w, height: h };
}

// ─── Multi-image row packing ─────────────────────────────────

function safeAspect(meta: ImageMeta): number {
  if (meta.width > 0 && meta.height > 0) {
    return Math.max(0.5, Math.min(2.5, meta.width / meta.height));
  }
  // Unknown → square
  return 1;
}

/**
 * Telegram-style row packing.
 *
 * Greedy: add images to the current row. When the row height
 * drops below `targetH`, break and start a new row.
 * Each row divides horizontal space proportionally by aspect ratio.
 *
 * Returns absolute-positioned rects for every image.
 */
export function computeMultiImageLayout(
  metas: ImageMeta[],
  chatWidth: number,
): { totalWidth: number; totalHeight: number; rects: LayoutRect[] } {
  const maxW = Math.round(chatWidth * 0.72);
  const targetH = Math.round(maxW * 0.35);
  const minRowH = Math.round(maxW * 0.2);
  const maxRowH = Math.round(maxW * 0.45);

  const aspects = metas.map(safeAspect);

  // Build rows greedily
  type Row = { indices: number[]; aspects: number[] };
  const rows: Row[] = [];
  let currentRow: Row = { indices: [], aspects: [] };

  for (let i = 0; i < metas.length; i++) {
    currentRow.indices.push(i);
    currentRow.aspects.push(aspects[i]);

    // Compute row height if we close the row here
    const totalAspect = currentRow.aspects.reduce((sum, a) => sum + a, 0);
    const gapSpace = (currentRow.indices.length - 1) * GAP;
    const rowH = (maxW - gapSpace) / totalAspect;

    if (rowH <= targetH && currentRow.indices.length >= 2) {
      rows.push(currentRow);
      currentRow = { indices: [], aspects: [] };
    }
  }
  // Flush remaining
  if (currentRow.indices.length > 0) {
    rows.push(currentRow);
  }

  // Layout rows
  const rects: LayoutRect[] = new Array(metas.length);
  let y = 0;

  for (const row of rows) {
    const totalAspect = row.aspects.reduce((sum, a) => sum + a, 0);
    const gapSpace = (row.indices.length - 1) * GAP;
    let rowH = Math.round((maxW - gapSpace) / totalAspect);
    rowH = Math.max(minRowH, Math.min(maxRowH, rowH));

    let x = 0;
    for (let j = 0; j < row.indices.length; j++) {
      const idx = row.indices[j];
      const isLast = j === row.indices.length - 1;
      const w = isLast
        ? maxW - x // Fill remaining space to avoid sub-pixel gaps
        : Math.round(rowH * row.aspects[j]);
      rects[idx] = { x, y, width: w, height: rowH };
      x += w + GAP;
    }
    y += rowH + GAP;
  }

  // Total height: subtract trailing gap
  const totalHeight = Math.max(0, y - GAP);

  return { totalWidth: maxW, totalHeight, rects };
}

// ─── Unified entry point ─────────────────────────────────────

export function computeImageLayout(
  metas: ImageMeta[],
  chatWidth: number,
): ImageLayout {
  if (metas.length === 0) {
    return { kind: 'single', width: 0, height: 0 };
  }
  if (metas.length === 1) {
    const size = computeSingleImageSize(metas[0], chatWidth);
    return { kind: 'single', ...size };
  }
  const grid = computeMultiImageLayout(metas, chatWidth);
  return { kind: 'grid', ...grid };
}
