// DOM layout may briefly report zero or tiny dimensions while an iframe resizes.
export function boardLayout(width, height, cols, rows, pixelRatio = 1) {
  if (![width, height].every(v => Number.isFinite(v) && v > 0)
    || ![cols, rows].every(v => Number.isInteger(v) && v > 0)) return null;
  const size = Math.min(Math.max(0, width - 24) / cols, Math.max(0, height - 24) / rows);
  if (!Number.isFinite(size) || size < 3) return null;
  const segment = Math.max(0, size - 2);
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? Math.min(pixelRatio, 2) : 1;
  return {
    size, segment, radius: Math.min(4, segment / 2), ratio,
    x: (width - size * cols) / 2, y: (height - size * rows) / 2,
    pixelWidth: Math.max(1, Math.round(width * ratio)),
    pixelHeight: Math.max(1, Math.round(height * ratio)),
  };
}
