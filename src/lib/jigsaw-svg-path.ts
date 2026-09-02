/**
 * SVG jigsaw piece path — uses the same tab/blank geometry as canvas-engine.ts
 * tabs: [top, right, bottom, left] — 1 = tab (outward), -1 = blank (inward), 0 = flat
 */
export type JigsawEdge = -1 | 0 | 1;

function appendJigsawSide(
  path: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  direction: JigsawEdge,
  tabSize: number
): string {
  if (direction === 0) {
    return `${path} L ${fmt(endX)} ${fmt(endY)}`;
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return path;

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy * direction;
  const py = ux * direction;

  const neckStart = 0.35;
  const neckEnd = 0.65;
  const neckWidth = 0.1;
  const headWidth = 0.14;

  const p1x = startX + ux * len * neckStart;
  const p1y = startY + uy * len * neckStart;
  const p2x = startX + ux * len * neckEnd;
  const p2y = startY + uy * len * neckEnd;

  const n1x = p1x + px * tabSize * neckWidth;
  const n1y = p1y + py * tabSize * neckWidth;
  const n2x = p2x + px * tabSize * neckWidth;
  const n2y = p2y + py * tabSize * neckWidth;

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const h1x = p1x - ux * len * headWidth + px * tabSize;
  const h1y = p1y - uy * len * headWidth + py * tabSize;
  const h2x = p2x + ux * len * headWidth + px * tabSize;
  const h2y = p2y + uy * len * headWidth + py * tabSize;

  const headMidX = midX + px * tabSize * 1.1;
  const headMidY = midY + py * tabSize * 1.1;

  return (
    `${path}` +
    ` L ${fmt(p1x)} ${fmt(p1y)}` +
    ` L ${fmt(n1x)} ${fmt(n1y)}` +
    ` C ${fmt(h1x)} ${fmt(h1y)} ${fmt(headMidX)} ${fmt(headMidY)} ${fmt(headMidX)} ${fmt(headMidY)}` +
    ` C ${fmt(headMidX)} ${fmt(headMidY)} ${fmt(h2x)} ${fmt(h2y)} ${fmt(n2x)} ${fmt(n2y)}` +
    ` L ${fmt(p2x)} ${fmt(p2y)}` +
    ` L ${fmt(endX)} ${fmt(endY)}`
  );
}

function fmt(value: number): string {
  return value.toFixed(2);
}

export function buildJigsawSvgPath(
  tabs: [JigsawEdge, JigsawEdge, JigsawEdge, JigsawEdge],
  size = 100
): string {
  const margin = size * 0.11;
  const x = margin;
  const y = margin;
  const w = size - margin * 2;
  const h = size - margin * 2;
  const tabSize = Math.min(w, h) * 0.22;

  const edges = {
    top: tabs[0],
    right: tabs[1],
    bottom: tabs[2],
    left: tabs[3],
  };

  let path = `M ${fmt(x)} ${fmt(y)}`;
  path = appendJigsawSide(path, x, y, x + w, y, edges.top, tabSize);
  path = appendJigsawSide(path, x + w, y, x + w, y + h, edges.right, tabSize);
  path = appendJigsawSide(path, x + w, y + h, x, y + h, (-edges.bottom) as JigsawEdge, tabSize);
  path = appendJigsawSide(path, x, y + h, x, y, (-edges.left) as JigsawEdge, tabSize);

  return `${path} Z`;
}
