const PADDING = 60;
const MIN_EXTENT_RATIO = 0.25;

export function computeLineViewBox(
  stations: { x: number; y: number }[],
  cityViewBox: string
): string {
  const [, , cityWidthStr, cityHeightStr] = cityViewBox.split(' ');
  const cityWidth = parseFloat(cityWidthStr);
  const cityHeight = parseFloat(cityHeightStr);

  const xs = stations.map((s) => s.x);
  const ys = stations.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const minWidth = cityWidth * MIN_EXTENT_RATIO;
  const minHeight = cityHeight * MIN_EXTENT_RATIO;

  const width = Math.max(maxX - minX + PADDING * 2, minWidth);
  const height = Math.max(maxY - minY + PADDING * 2, minHeight);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return `${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
}
