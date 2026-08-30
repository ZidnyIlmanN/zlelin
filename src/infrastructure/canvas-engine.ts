import { PuzzlePiece, EdgeShape } from '@/domain/puzzle';
import { PeerCursor } from '@/domain/room';

/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Ensures that all users in the same room generate the EXACT SAME puzzle edges and initial layout.
 */
function createPRNG(seedStr: string) {
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

/**
 * Draws one side of a jigsaw piece with a tab (1) or blank (-1) or flat (0).
 */
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
  const neckWidth = 0.10;
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

/**
 * Build the full jigsaw piece clipping path.
 */
function buildJigsawPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  edges: { top: EdgeShape; right: EdgeShape; bottom: EdgeShape; left: EdgeShape },
  tabSize: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);

  // Top edge: left to right
  jigsawSidePath(ctx, x, y, x + w, y, edges.top, tabSize);

  // Right edge: top to bottom
  jigsawSidePath(ctx, x + w, y, x + w, y + h, edges.right, tabSize);

  // Bottom edge: right to left
  jigsawSidePath(ctx, x + w, y + h, x, y + h, -edges.bottom as EdgeShape, tabSize);

  // Left edge: bottom to top
  jigsawSidePath(ctx, x, y + h, x, y, -edges.left as EdgeShape, tabSize);

  ctx.closePath();
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement;
  public pieces: PuzzlePiece[] = [];
  public draggedPiece: PuzzlePiece | null = null;
  private dragCluster: PuzzlePiece[] = [];
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  public currentUserName = 'Player';
  public roomSeed = 'ZLE-ROOM';

  // Graph of connections between piece IDs
  private connections: Map<number, Set<number>> = new Map();

  // Smooth zoom and pan state
  public zoomLevel = 1;
  private targetZoom = 1;
  public panX = 0;
  public panY = 0;
  private targetPanX = 0;
  private targetPanY = 0;

  private cols = 6;
  private rows = 4;

  public boardWidth = 400;
  public boardHeight = 300;
  public showReference = true;

  public peerCursors: PeerCursor[] = [];

  private animFrameId: number | null = null;
  public onSnapCallback?: (piece: PuzzlePiece) => void;
  public onDetachCallback?: (piece: PuzzlePiece) => void;
  public onVictoryCallback?: () => void;
  public onLiveDragCallback?: (pieces: { pieceId: number; x: number; y: number }[], heldBy: string) => void;
  public onLiveReleaseCallback?: (pieces: { pieceId: number; x: number; y: number; isSnapped: boolean }[]) => void;

  // Throttling for live drag broadcast
  private lastLiveDragTime = 0;

  // Panning state
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;

  // Tab protrusion size
  private tabSize = 12;

  constructor(canvas: HTMLCanvasElement, imageSrc: string, pieceCount: number = 24, seed: string = 'ZLE-ROOM', userName: string = 'Player') {
    this.canvas = canvas;
    this.roomSeed = seed;
    this.currentUserName = userName;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    this.image = new Image();
    this.image.crossOrigin = 'Anonymous';
    this.image.onload = () => {
      this.generatePieces(pieceCount, this.roomSeed);
      this.startAnimation();
    };
    this.image.src = imageSrc;

    this.attachEvents();
  }

  /**
   * Deterministically generate pieces, complementary edge tabs/blanks, and initial scatter layout.
   */
  public generatePieces(totalPieces: number, seed: string = this.roomSeed) {
    this.pieces = [];
    this.connections.clear();

    const prng = createPRNG(`${seed}-${totalPieces}`);

    let cols = 6;
    let rows = 4;
    if (totalPieces === 12) {
      cols = 4;
      rows = 3;
    } else if (totalPieces === 48) {
      cols = 8;
      rows = 6;
    }
    this.cols = cols;
    this.rows = rows;

    const pieceW = this.boardWidth / cols;
    const pieceH = this.boardHeight / rows;
    this.tabSize = Math.min(pieceW, pieceH) * 0.22;

    // Generate matching complementary edge shapes using PRNG
    const horizontalEdges: EdgeShape[][] = [];
    for (let r = 0; r < rows; r++) {
      horizontalEdges[r] = [];
      for (let c = 0; c <= cols; c++) {
        if (c === 0 || c === cols) {
          horizontalEdges[r][c] = 0;
        } else {
          horizontalEdges[r][c] = prng() > 0.5 ? 1 : -1;
        }
      }
    }

    const verticalEdges: EdgeShape[][] = [];
    for (let r = 0; r <= rows; r++) {
      verticalEdges[r] = [];
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows) {
          verticalEdges[r][c] = 0;
        } else {
          verticalEdges[r][c] = prng() > 0.5 ? 1 : -1;
        }
      }
    }

    // Board center coordinates on a standard 1000x700 reference space
    const refW = Math.max(900, this.canvas.width || 1000);
    const refH = Math.max(600, this.canvas.height || 700);

    const boardStartX = (refW - this.boardWidth) / 2;
    const boardStartY = (refH - this.boardHeight) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        this.connections.set(id, new Set());

        const edges = {
          top: verticalEdges[r][c] as EdgeShape,
          right: horizontalEdges[r][c + 1] as EdgeShape,
          bottom: (verticalEdges[r + 1]?.[c] ?? 0) as EdgeShape,
          left: (horizontalEdges[r]?.[c] ?? 0) as EdgeShape,
        };

        this.pieces.push({
          id,
          col: c,
          row: r,
          targetX: c * pieceW,
          targetY: r * pieceH,
          x: 0,
          y: 0,
          width: pieceW,
          height: pieceH,
          edges,
          groupId: id,
          isSnapped: false,
          heldBy: null,
        });
      }
    }

    // Apply deterministic organic random scatter around the central assembly board
    const scatterPos = this.getOrganicScatterPositions(this.pieces, prng);
    this.pieces.forEach((p) => {
      const pos = scatterPos.get(p.id);
      if (pos) {
        p.x = pos.x;
        p.y = pos.y;
      }
    });
  }

  /**
   * Computes an organic, natural random scatter layout for puzzle pieces
   * distributed around the central assembly board without overlapping the board.
   */
  private getOrganicScatterPositions(
    piecesToScatter: PuzzlePiece[],
    prng: () => number
  ): Map<number, { x: number; y: number }> {
    const positions = new Map<number, { x: number; y: number }>();
    if (piecesToScatter.length === 0) return positions;

    const refW = Math.max(1050, this.canvas.width || 1200);
    const refH = Math.max(680, this.canvas.height || 750);

    const boardStartX = (refW - this.boardWidth) / 2;
    const boardStartY = (refH - this.boardHeight) / 2;

    const pieceW = piecesToScatter[0].width;
    const pieceH = piecesToScatter[0].height;

    // Define 3 primary spawn regions around the central puzzle board
    const regions = [
      // Left table region
      {
        minX: 35,
        maxX: Math.max(45, boardStartX - pieceW - 35),
        minY: 70,
        maxY: Math.max(120, refH - pieceH - 60),
      },
      // Right table region
      {
        minX: boardStartX + this.boardWidth + 35,
        maxX: Math.max(boardStartX + this.boardWidth + 45, refW - pieceW - 40),
        minY: 70,
        maxY: Math.max(120, refH - pieceH - 60),
      },
      // Bottom table region
      {
        minX: Math.max(35, boardStartX - 60),
        maxX: Math.min(refW - pieceW - 40, boardStartX + this.boardWidth + 60 - pieceW),
        minY: boardStartY + this.boardHeight + 35,
        maxY: Math.max(boardStartY + this.boardHeight + 45, refH - pieceH - 50),
      },
    ];

    const slots: { x: number; y: number }[] = [];

    const generateSlotsForRegion = (region: (typeof regions)[0], targetCount: number) => {
      const w = Math.max(pieceW, region.maxX - region.minX);
      const h = Math.max(pieceH, region.maxY - region.minY);

      const cols = Math.max(1, Math.floor(w / (pieceW * 0.82)));
      const rows = Math.max(1, Math.ceil(targetCount / cols));

      const colStep = cols > 1 ? (region.maxX - region.minX) / (cols - 1) : 0;
      const rowStep = rows > 1 ? (region.maxY - region.minY) / (rows - 1) : 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = region.minX + c * colStep;
          const baseY = region.minY + r * rowStep;
          // Organic randomized jitter
          const jitterX = (prng() - 0.5) * (pieceW * 0.4);
          const jitterY = (prng() - 0.5) * (pieceH * 0.4);

          slots.push({
            x: Math.round(Math.max(region.minX, Math.min(region.maxX, baseX + jitterX))),
            y: Math.round(Math.max(region.minY, Math.min(region.maxY, baseY + jitterY))),
          });
        }
      }
    };

    const total = piecesToScatter.length;
    const bottomCount = Math.floor(total * 0.2);
    const sideCount = Math.ceil((total - bottomCount) / 2);

    generateSlotsForRegion(regions[0], sideCount);
    generateSlotsForRegion(regions[1], sideCount);
    generateSlotsForRegion(regions[2], bottomCount);

    // Shuffle slots deterministically using PRNG (Fisher-Yates)
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const temp = slots[i];
      slots[i] = slots[j];
      slots[j] = temp;
    }

    // Assign positions to pieces
    piecesToScatter.forEach((p, idx) => {
      const slot = slots[idx] || {
        x: Math.round(regions[0].minX + prng() * (regions[0].maxX - regions[0].minX)),
        y: Math.round(regions[0].minY + prng() * (regions[0].maxY - regions[0].minY)),
      };
      positions.set(p.id, slot);
    });

    return positions;
  }

  /**
   * Apply live remote piece drag coordinates from peers.
   */
  public applyRemoteDrag(movedPieces: { pieceId: number; x: number; y: number }[], heldBy: string) {
    const movedIds = new Set(movedPieces.map((p) => p.pieceId));

    // Clear stale heldBy for this user on any piece not currently moved
    this.pieces.forEach((p) => {
      if (p.heldBy === heldBy && !movedIds.has(p.id)) {
        p.heldBy = null;
      }
    });

    movedPieces.forEach(({ pieceId, x, y }) => {
      const p = this.pieces.find((piece) => piece.id === pieceId);
      if (p && p !== this.draggedPiece) {
        p.x = x;
        p.y = y;
        p.heldBy = heldBy;
      }
    });
  }

  /**
   * Apply live release coordinates from peers.
   */
  public applyRemoteRelease(pieces: { pieceId: number; x: number; y: number; isSnapped: boolean }[], heldBy?: string) {
    pieces.forEach(({ pieceId, x, y, isSnapped }) => {
      const p = this.pieces.find((piece) => piece.id === pieceId);
      if (p) {
        p.x = x;
        p.y = y;
        p.isSnapped = isSnapped;
        p.heldBy = null;
      }
    });

    if (heldBy) {
      this.pieces.forEach((p) => {
        if (p.heldBy === heldBy) p.heldBy = null;
      });
    }
  }

  /**
   * Sync the whole board state from peer/host.
   */
  public applyBoardSync(syncPieces: { id: number; x: number; y: number; isSnapped: boolean; connections: number[] }[]) {
    const pieceById = new Map<number, PuzzlePiece>();
    this.pieces.forEach((p) => pieceById.set(p.id, p));

    syncPieces.forEach((sp) => {
      const p = pieceById.get(sp.id);
      if (p && p !== this.draggedPiece) {
        p.x = sp.x;
        p.y = sp.y;
        p.isSnapped = sp.isSnapped;
        p.heldBy = null;
        if (sp.connections) {
          const validConnections = new Set<number>();
          for (const neighborId of sp.connections) {
            if (pieceById.has(neighborId) && neighborId !== sp.id) {
              validConnections.add(neighborId);
            }
          }
          this.connections.set(sp.id, validConnections);
        }
      }
    });
    this.updateSnappedStatus();
  }

  /**
   * Export current board state for syncing to newly joined peers.
   */
  public exportBoardState() {
    return this.pieces.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      isSnapped: p.isSnapped,
      connections: Array.from(this.connections.get(p.id) || []),
    }));
  }

  /** Get all pieces in the connected component containing `piece` */
  public getCluster(piece: PuzzlePiece): PuzzlePiece[] {
    const visited = new Set<number>();
    const queue = [piece.id];
    visited.add(piece.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const neighbors = this.connections.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }

    return this.pieces.filter((p) => visited.has(p.id));
  }

  /** Check if two pieces belong to the same connected cluster */
  private isSameCluster(p1: PuzzlePiece, p2: PuzzlePiece): boolean {
    const cluster = this.getCluster(p1);
    return cluster.some((p) => p.id === p2.id);
  }

  /** Detach a piece from all its current connections */
  public detachPiece(piece: PuzzlePiece): boolean {
    const neighborIds = this.connections.get(piece.id);
    if (!neighborIds || neighborIds.size === 0) return false;

    for (const neighborId of neighborIds) {
      this.connections.get(neighborId)?.delete(piece.id);
    }
    neighborIds.clear();

    this.updateSnappedStatus();

    if (this.onDetachCallback) {
      this.onDetachCallback(piece);
    }
    return true;
  }

  /** Connect two pieces together and record the connection */
  private connectPieces(p1: PuzzlePiece, p2: PuzzlePiece) {
    if (p1.id === p2.id) return;
    this.connections.get(p1.id)?.add(p2.id);
    this.connections.get(p2.id)?.add(p1.id);
    this.updateSnappedStatus();
  }

  /** Update isSnapped state: true if piece has at least one connection */
  private updateSnappedStatus() {
    this.pieces.forEach((p) => {
      const conns = this.connections.get(p.id);
      p.isSnapped = !!conns && conns.size > 0;
    });
  }

  /**
   * Try snapping the dragged cluster to nearby pieces based on physical jigsaw edge contour matching.
   * Allows pieces with complementary edge shapes (tab into blank) to snap together even if mismatched,
   * while strictly preventing incompatible edge shapes (tab-tab, blank-blank, flat edges) from snapping.
   */
  private trySnapCluster(draggedPiece: PuzzlePiece, cluster: PuzzlePiece[]): boolean {
    const clusterSet = new Set(cluster.map((p) => p.id));
    const otherPieces = this.pieces.filter((p) => !clusterSet.has(p.id));
    const snapThreshold = Math.min(draggedPiece.width, draggedPiece.height) * 0.28;

    for (const member of cluster) {
      for (const target of otherPieces) {
        // 1. Member brought to the LEFT of target (Target is to the RIGHT of member)
        {
          const errX = target.x - (member.x + member.width);
          const errY = target.y - member.y;
          const dist = Math.sqrt(errX * errX + errY * errY);

          if (dist < snapThreshold) {
            // Mechanical check: member right edge meets target left edge
            const canSnap = member.edges.right === target.edges.left && member.edges.right !== 0;
            if (canSnap) {
              for (const p of cluster) {
                p.x += errX;
                p.y += errY;
              }
              this.connectPieces(member, target);
              return true;
            }
          }
        }

        // 2. Member brought to the RIGHT of target (Target is to the LEFT of member)
        {
          const errX = (target.x + target.width) - member.x;
          const errY = target.y - member.y;
          const dist = Math.sqrt(errX * errX + errY * errY);

          if (dist < snapThreshold) {
            // Mechanical check: member left edge meets target right edge
            const canSnap = member.edges.left === target.edges.right && member.edges.left !== 0;
            if (canSnap) {
              for (const p of cluster) {
                p.x += errX;
                p.y += errY;
              }
              this.connectPieces(member, target);
              return true;
            }
          }
        }

        // 3. Member brought ABOVE target (Target is BELOW member)
        {
          const errX = target.x - member.x;
          const errY = target.y - (member.y + member.height);
          const dist = Math.sqrt(errX * errX + errY * errY);

          if (dist < snapThreshold) {
            // Mechanical check: member bottom edge meets target top edge
            const canSnap = member.edges.bottom === target.edges.top && member.edges.bottom !== 0;
            if (canSnap) {
              for (const p of cluster) {
                p.x += errX;
                p.y += errY;
              }
              this.connectPieces(member, target);
              return true;
            }
          }
        }

        // 4. Member brought BELOW target (Target is ABOVE member)
        {
          const errX = target.x - member.x;
          const errY = (target.y + target.height) - member.y;
          const dist = Math.sqrt(errX * errX + errY * errY);

          if (dist < snapThreshold) {
            // Mechanical check: member top edge meets target bottom edge
            const canSnap = member.edges.top === target.edges.bottom && member.edges.top !== 0;
            if (canSnap) {
              for (const p of cluster) {
                p.x += errX;
                p.y += errY;
              }
              this.connectPieces(member, target);
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if the entire puzzle is correctly assembled.
   */
  private checkVictory(): boolean {
    if (this.pieces.length === 0) return false;

    const cluster = this.getCluster(this.pieces[0]);
    if (cluster.length !== this.pieces.length) return false;

    const root = this.pieces[0];
    const tolerance = 4;

    for (const p of this.pieces) {
      const expectedRelX = (p.col - root.col) * root.width;
      const expectedRelY = (p.row - root.row) * root.height;
      const actualRelX = p.x - root.x;
      const actualRelY = p.y - root.y;

      if (
        Math.abs(actualRelX - expectedRelX) > tolerance ||
        Math.abs(actualRelY - expectedRelY) > tolerance
      ) {
        return false;
      }
    }

    return true;
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public startAnimation = () => {
    const render = () => {
      this.updateSmoothZoom();
      this.draw();
      this.animFrameId = requestAnimationFrame(render);
    };
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    render();
  };

  public stopAnimation = () => {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  };

  private updateSmoothZoom() {
    const lerpFactor = 0.15;
    this.zoomLevel += (this.targetZoom - this.zoomLevel) * lerpFactor;
    this.panX += (this.targetPanX - this.panX) * lerpFactor;
    this.panY += (this.targetPanY - this.panY) * lerpFactor;

    if (Math.abs(this.targetZoom - this.zoomLevel) < 0.001) this.zoomLevel = this.targetZoom;
    if (Math.abs(this.targetPanX - this.panX) < 0.5) this.panX = this.targetPanX;
    if (Math.abs(this.targetPanY - this.panY) < 0.5) this.panY = this.targetPanY;
  }

  private draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoomLevel, this.zoomLevel);

    // Sort pieces so currently dragged cluster or remotely held pieces render on top
    const draggedSet = new Set(this.dragCluster.map((p) => p.id));
    const sortedPieces = [...this.pieces].sort((a, b) => {
      const aHeld = draggedSet.has(a.id) || Boolean(a.heldBy);
      const bHeld = draggedSet.has(b.id) || Boolean(b.heldBy);
      if (aHeld && !bHeld) return 1;
      if (!aHeld && bHeld) return -1;
      return 0;
    });

    sortedPieces.forEach((p) => {
      this.drawPiece(p);
    });

    // Draw ONE single clean badge per remotely dragged cluster
    this.drawClusterBadges();

    ctx.restore();
  }

  private drawPiece(p: PuzzlePiece) {
    const { ctx, image } = this;
    if (!image.complete || image.naturalWidth === 0) return;

    ctx.save();

    const isLocalDragged = this.draggedPiece && this.isSameCluster(p, this.draggedPiece);
    const isRemoteHeld = Boolean(p.heldBy);

    if (isLocalDragged) {
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
    } else if (isRemoteHeld) {
      ctx.shadowColor = 'rgba(120, 138, 117, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
    }

    // Clip to exact jigsaw contour
    ctx.save();
    buildJigsawPath(ctx, p.x, p.y, p.width, p.height, p.edges, this.tabSize);
    ctx.clip();

    const scaleX = image.width / (this.cols * p.width);
    const scaleY = image.height / (this.rows * p.height);

    const pad = this.tabSize + 4;
    const srcPadX = pad * scaleX;
    const srcPadY = pad * scaleY;

    const sx = p.col * p.width * scaleX - srcPadX;
    const sy = p.row * p.height * scaleY - srcPadY;
    const sw = p.width * scaleX + 2 * srcPadX;
    const sh = p.height * scaleY + 2 * srcPadY;

    const dx = p.x - pad;
    const dy = p.y - pad;
    const dw = p.width + 2 * pad;
    const dh = p.height + 2 * pad;

    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();

    // Subtle edge outline
    buildJigsawPath(ctx, p.x, p.y, p.width, p.height, p.edges, this.tabSize);
    ctx.strokeStyle = isLocalDragged
      ? 'rgba(255,255,255,0.95)'
      : isRemoteHeld
      ? 'rgba(120, 138, 117, 0.85)'
      : 'rgba(50, 40, 30, 0.25)';
    ctx.lineWidth = isLocalDragged ? 2.2 : isRemoteHeld ? 2 : 1.2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw a single unified floating pill badge per remotely dragging user.
   */
  private drawClusterBadges() {
    const { ctx } = this;
    const userPiecesMap = new Map<string, PuzzlePiece[]>();

    // Group all currently held pieces by user name
    this.pieces.forEach((p) => {
      if (p.heldBy) {
        const list = userPiecesMap.get(p.heldBy) || [];
        list.push(p);
        userPiecesMap.set(p.heldBy, list);
      }
    });

    userPiecesMap.forEach((heldPieces, userName) => {
      if (heldPieces.length === 0) return;

      // Find bounding box for all pieces dragged by this user
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;

      heldPieces.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x + p.width > maxX) maxX = p.x + p.width;
        if (p.y < minY) minY = p.y;
      });

      const badgeText = heldPieces.length > 1
        ? `${userName} is moving this cluster`
        : `${userName} is moving this piece`;

      ctx.save();
      ctx.font = 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const badgeWidth = textWidth + 24;
      const badgeHeight = 24;
      const badgeX = (minX + maxX) / 2 - badgeWidth / 2;
      const badgeY = minY - 32;

      // Elevated soft shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      // Rounded pill background with cozy green sage gradient
      ctx.fillStyle = 'rgba(120, 138, 117, 0.95)';
      ctx.beginPath();
      const r = 12;
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, r);
      ctx.fill();

      // Pill border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Text
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, badgeX + 12, badgeY + 16);

      ctx.restore();
    });
  }

  private attachEvents() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.panX) / this.zoomLevel;
    const y = (screenY - rect.top - this.panY) / this.zoomLevel;
    return { x, y };
  }

  private isPointInPiece(worldX: number, worldY: number, p: PuzzlePiece): boolean {
    buildJigsawPath(this.ctx, p.x, p.y, p.width, p.height, p.edges, this.tabSize);
    return this.ctx.isPointInPath(worldX, worldY);
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1 || (e.button === 2 && !e.shiftKey)) {
      this.isPanning = true;
      this.panStartX = e.clientX - this.targetPanX;
      this.panStartY = e.clientY - this.targetPanY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const world = this.screenToWorld(e.clientX, e.clientY);

    let foundPiece: PuzzlePiece | null = null;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (this.isPointInPiece(world.x, world.y, p)) {
        foundPiece = p;
        break;
      }
    }

    if (foundPiece) {
      if (e.shiftKey || e.altKey) {
        this.detachPiece(foundPiece);
        this.draggedPiece = foundPiece;
        this.dragCluster = [foundPiece];
      } else {
        this.draggedPiece = foundPiece;
        this.dragCluster = this.getCluster(foundPiece);
      }

      this.dragOffsetX = world.x - foundPiece.x;
      this.dragOffsetY = world.y - foundPiece.y;

      const clusterIds = new Set(this.dragCluster.map((p) => p.id));
      const rest = this.pieces.filter((p) => !clusterIds.has(p.id));
      this.pieces = [...rest, ...this.dragCluster];

      this.canvas.style.cursor = 'grabbing';

      // Broadcast start of live drag
      if (this.onLiveDragCallback) {
        const clusterData = this.dragCluster.map((p) => ({ pieceId: p.id, x: p.x, y: p.y }));
        this.onLiveDragCallback(clusterData, this.currentUserName);
      }
    } else {
      this.isPanning = true;
      this.panStartX = e.clientX - this.targetPanX;
      this.panStartY = e.clientY - this.targetPanY;
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPanning) {
      this.targetPanX = e.clientX - this.panStartX;
      this.targetPanY = e.clientY - this.panStartY;
      this.panX = this.targetPanX;
      this.panY = this.targetPanY;
      return;
    }

    if (this.draggedPiece && this.dragCluster.length > 0) {
      const world = this.screenToWorld(e.clientX, e.clientY);
      const newX = world.x - this.dragOffsetX;
      const newY = world.y - this.dragOffsetY;

      const dx = newX - this.draggedPiece.x;
      const dy = newY - this.draggedPiece.y;

      for (const p of this.dragCluster) {
        p.x += dx;
        p.y += dy;
      }

      // Throttled live drag broadcast (~30ms)
      const now = performance.now();
      if (now - this.lastLiveDragTime > 30) {
        this.lastLiveDragTime = now;
        if (this.onLiveDragCallback) {
          const clusterData = this.dragCluster.map((p) => ({ pieceId: p.id, x: p.x, y: p.y }));
          this.onLiveDragCallback(clusterData, this.currentUserName);
        }
      }
    }
  };

  private handleMouseUp = () => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'grab';
      return;
    }

    if (this.draggedPiece && this.dragCluster.length > 0) {
      const didSnap = this.trySnapCluster(this.draggedPiece, this.dragCluster);

      if (didSnap) {
        if (this.onSnapCallback) {
          this.onSnapCallback(this.draggedPiece);
        }

        if (this.checkVictory()) {
          if (this.onVictoryCallback) {
            setTimeout(this.onVictoryCallback, 400);
          }
        }
      }

      // Broadcast live release to clear heldBy and sync final position
      if (this.onLiveReleaseCallback) {
        const clusterData = this.dragCluster.map((p) => ({ pieceId: p.id, x: p.x, y: p.y, isSnapped: p.isSnapped }));
        this.onLiveReleaseCallback(clusterData);
      }

      this.draggedPiece = null;
      this.dragCluster = [];
      this.canvas.style.cursor = 'grab';
    }
  };

  private handleDoubleClick = (e: MouseEvent) => {
    const world = this.screenToWorld(e.clientX, e.clientY);

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (this.isPointInPiece(world.x, world.y, p)) {
        this.detachPiece(p);
        break;
      }
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const world = this.screenToWorld(e.clientX, e.clientY);

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (this.isPointInPiece(world.x, world.y, p)) {
        this.detachPiece(p);
        return;
      }
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomDelta = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(0.3, Math.min(3.0, this.targetZoom * zoomDelta));

    const worldXBefore = (mouseX - this.targetPanX) / this.targetZoom;
    const worldYBefore = (mouseY - this.targetPanY) / this.targetZoom;

    this.targetZoom = newZoom;

    const worldXAfter = worldXBefore * this.targetZoom;
    const worldYAfter = worldYBefore * this.targetZoom;

    this.targetPanX = mouseX - worldXAfter;
    this.targetPanY = mouseY - worldYAfter;
  };

  public scatterUnsnapped(seed?: number): { id: number; x: number; y: number }[] {
    const prng = createPRNG(`${this.roomSeed}-scatter-${seed || Date.now()}`);
    const unsnappedPieces = this.pieces.filter((p) => this.getCluster(p).length === 1 && !p.isSnapped);
    const scatterPos = this.getOrganicScatterPositions(unsnappedPieces, prng);

    const scatteredPieces: { id: number; x: number; y: number }[] = [];

    unsnappedPieces.forEach((p) => {
      const pos = scatterPos.get(p.id);
      if (pos) {
        p.x = pos.x;
        p.y = pos.y;
        scatteredPieces.push({ id: p.id, x: p.x, y: p.y });
      }
    });

    return scatteredPieces;
  }

  public applyRemoteScatter(scatteredPieces: { id: number; x: number; y: number }[]) {
    scatteredPieces.forEach(({ id, x, y }) => {
      const p = this.pieces.find((piece) => piece.id === id);
      if (p && !p.isSnapped) {
        p.x = x;
        p.y = y;
      }
    });
  }

  public zoom(factor: number) {
    const newZoom = Math.max(0.3, Math.min(3.0, this.targetZoom * factor));
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const worldXBefore = (centerX - this.targetPanX) / this.targetZoom;
    const worldYBefore = (centerY - this.targetPanY) / this.targetZoom;

    this.targetZoom = newZoom;

    const worldXAfter = worldXBefore * this.targetZoom;
    const worldYAfter = worldYBefore * this.targetZoom;

    this.targetPanX = centerX - worldXAfter;
    this.targetPanY = centerY - worldYAfter;
  }

  public resetView() {
    this.targetZoom = 1;
    this.targetPanX = 0;
    this.targetPanY = 0;
  }

  public destroy() {
    this.stopAnimation();
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
