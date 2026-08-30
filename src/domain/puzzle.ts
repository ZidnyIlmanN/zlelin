export interface PuzzleItem {
  id: number | string;
  title: string;
  category: 'Nature' | 'Cozy Interiors' | 'Cityscapes' | 'Minimal & Abstract' | 'Illustration';
  pieces: number;
  url: string;
}

/** Edge shape: 0 = flat (border edge), 1 = tab (protrusion), -1 = blank (indentation) */
export type EdgeShape = -1 | 0 | 1;

export interface PieceEdges {
  top: EdgeShape;
  right: EdgeShape;
  bottom: EdgeShape;
  left: EdgeShape;
}

export interface PuzzlePiece {
  id: number;
  col: number;
  row: number;
  /** Original target offset relative to puzzle origin (for calculating neighbor offsets) */
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  edges: PieceEdges;
  groupId: number;
  isSnapped: boolean;
  heldBy: string | null;
  heldByColor?: string;
}

export interface CanvasTransform {
  zoomLevel: number;
  panX: number;
  panY: number;
}
