import { EdgeShape, PieceEdges } from '@/domain/puzzle';

export function createPRNG(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let seed = h >>> 0;

  return function nextRandom() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getGridDimensions(totalPieces: number): { cols: number; rows: number } {
  if (totalPieces === 12) return { cols: 4, rows: 3 };
  if (totalPieces === 48) return { cols: 8, rows: 6 };
  return { cols: 6, rows: 4 };
}

export interface JigsawGridPiece {
  col: number;
  row: number;
  edges: PieceEdges;
}

export interface JigsawGrid {
  cols: number;
  rows: number;
  tabSize: number;
  pieces: JigsawGridPiece[];
}

export function generateJigsawGrid(seed: string, totalPieces: number, boardWidth: number, boardHeight: number): JigsawGrid {
  const { cols, rows } = getGridDimensions(totalPieces);
  const prng = createPRNG(`${seed}-${totalPieces}`);
  const pieceW = boardWidth / cols;
  const pieceH = boardHeight / rows;
  const tabSize = Math.min(pieceW, pieceH) * 0.22;

  const horizontalEdges: EdgeShape[][] = [];
  for (let r = 0; r < rows; r++) {
    horizontalEdges[r] = [];
    for (let c = 0; c <= cols; c++) {
      horizontalEdges[r][c] = c === 0 || c === cols ? 0 : prng() > 0.5 ? 1 : -1;
    }
  }

  const verticalEdges: EdgeShape[][] = [];
  for (let r = 0; r <= rows; r++) {
    verticalEdges[r] = [];
    for (let c = 0; c < cols; c++) {
      verticalEdges[r][c] = r === 0 || r === rows ? 0 : prng() > 0.5 ? 1 : -1;
    }
  }

  const pieces: JigsawGridPiece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        col: c,
        row: r,
        edges: {
          top: verticalEdges[r][c] as EdgeShape,
          right: horizontalEdges[r][c + 1] as EdgeShape,
          bottom: (verticalEdges[r + 1]?.[c] ?? 0) as EdgeShape,
          left: (horizontalEdges[r]?.[c] ?? 0) as EdgeShape,
        },
      });
    }
  }

  return { cols, rows, tabSize, pieces };
}

function jigsawSidePath(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  direction: EdgeShape,
  tabSize: number
) {
  if (direction === 0) {
    ctx.lineTo(endX, endY);
    return;
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
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

  ctx.lineTo(p1x, p1y);
  ctx.lineTo(n1x, n1y);
  ctx.bezierCurveTo(h1x, h1y, headMidX, headMidY, headMidX, headMidY);
  ctx.bezierCurveTo(headMidX, headMidY, h2x, h2y, n2x, n2y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(endX, endY);
}

export function buildJigsawPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  edges: PieceEdges,
  tabSize: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  jigsawSidePath(ctx, x, y, x + w, y, edges.top, tabSize);
  jigsawSidePath(ctx, x + w, y, x + w, y + h, edges.right, tabSize);
  jigsawSidePath(ctx, x + w, y + h, x, y + h, -edges.bottom as EdgeShape, tabSize);
  jigsawSidePath(ctx, x, y + h, x, y, -edges.left as EdgeShape, tabSize);
  ctx.closePath();
}

export function drawAssembledPuzzle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  grid: JigsawGrid,
  boardWidth: number,
  boardHeight: number
) {
  const pieceW = boardWidth / grid.cols;
  const pieceH = boardHeight / grid.rows;

  ctx.clearRect(0, 0, boardWidth, boardHeight);

  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, boardWidth, boardHeight);
  }

  for (const piece of grid.pieces) {
    const px = piece.col * pieceW;
    const py = piece.row * pieceH;

    ctx.save();
    buildJigsawPath(ctx, px, py, pieceW, pieceH, piece.edges, grid.tabSize);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.lineWidth = 0.85;
    ctx.stroke();
    ctx.restore();
  }
}
