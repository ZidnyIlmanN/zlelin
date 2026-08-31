import * as THREE from 'three';
import { PuzzlePiece, EdgeShape } from '@/domain/puzzle';
import { PeerCursor } from '@/domain/room';
import { TableTheme } from '@/domain/theme';

/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
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
 * Builds a 2D jigsaw side path on a THREE.Shape.
 */
function jigsawSidePath3D(
  shape: THREE.Shape,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  direction: EdgeShape,
  tabSize: number
) {
  if (direction === 0) {
    shape.lineTo(endX, endY);
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

  shape.lineTo(p1x, p1y);
  shape.lineTo(n1x, n1y);
  shape.bezierCurveTo(h1x, h1y, headMidX, headMidY, headMidX, headMidY);
  shape.bezierCurveTo(headMidX, headMidY, h2x, h2y, n2x, n2y);
  shape.lineTo(p2x, p2y);
  shape.lineTo(endX, endY);
}

/**
 * Builds a complete interlocking THREE.Shape for a puzzle piece.
 */
function createJigsawShape(
  w: number,
  h: number,
  edges: { top: EdgeShape; right: EdgeShape; bottom: EdgeShape; left: EdgeShape },
  tabSize: number
): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);

  // Top: (0, 0) -> (w, 0)
  jigsawSidePath3D(shape, 0, 0, w, 0, edges.top, tabSize);

  // Right: (w, 0) -> (w, -h)
  jigsawSidePath3D(shape, w, 0, w, -h, edges.right, tabSize);

  // Bottom: (w, -h) -> (0, -h)
  jigsawSidePath3D(shape, w, -h, 0, -h, -edges.bottom as EdgeShape, tabSize);

  // Left: (0, -h) -> (0, 0)
  jigsawSidePath3D(shape, 0, -h, 0, 0, -edges.left as EdgeShape, tabSize);

  return shape;
}

export interface Piece3DUserData {
  piece: PuzzlePiece;
  originalMesh: THREE.Mesh;
}

/**
 * High-Performance 3D Puzzle Engine (WebGL / Three.js)
 * Tactile physical depth, realistic drop shadows, and 60+ FPS zero-lag interaction.
 */
export class ThreePuzzleEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mousePos = new THREE.Vector2();
  private dragPlane: THREE.Plane;
  private planeIntersection = new THREE.Vector3();

  public pieces: PuzzlePiece[] = [];
  public pieceMeshes: Map<number, THREE.Mesh> = new Map();
  public pieceHitBoxes: Map<number, THREE.Mesh> = new Map();
  private connections: Map<number, Set<number>> = new Map();

  private texture: THREE.Texture | null = null;
  private sideMaterial: THREE.MeshStandardMaterial;
  private frontMaterial: THREE.MeshStandardMaterial;

  public draggedPiece: PuzzlePiece | null = null;
  private dragCluster: PuzzlePiece[] = [];
  private dragOffsets: Map<number, { dx: number; dy: number }> = new Map();

  public boardWidth = 6.0;
  public boardHeight = 4.5;
  private cols = 6;
  private rows = 4;
  private tabSize = 0.35;

  public roomSeed = 'ZLE-ROOM';
  public currentUserName = 'Player';
  public showReference = true;

  // Camera & Panning State
  private isPanning = false;
  private panStartMouse = new THREE.Vector2();
  private panStartCamera = new THREE.Vector3();
  public zoomLevel = 1.0;
  private targetCameraPos = new THREE.Vector3(0, 0, 8.5);

  // Table & Environment
  private tableMesh: THREE.Mesh | null = null;
  private boardOutlineMesh: THREE.LineSegments | null = null;
  private referenceMesh: THREE.Mesh | null = null;

  // Callbacks
  public onSnapCallback?: (piece: PuzzlePiece) => void;
  public onDetachCallback?: (piece: PuzzlePiece) => void;
  public onVictoryCallback?: () => void;
  public onLiveDragCallback?: (pieces: { pieceId: number; x: number; y: number }[], heldBy: string) => void;
  public onLiveReleaseCallback?: (pieces: { pieceId: number; x: number; y: number; isSnapped: boolean }[]) => void;

  private animFrameId: number | null = null;
  private isDestroyed = false;
  private lastDragBroadcast = 0;

  constructor(
    container: HTMLElement,
    imageSrc: string,
    pieceCount: number = 24,
    seed: string = 'ZLE-ROOM',
    userName: string = 'Player',
    theme: TableTheme = 'forest'
  ) {
    this.container = container;
    this.roomSeed = seed;
    this.currentUserName = userName;

    // 1. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Replace any existing canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(this.renderer.domElement);

    // 2. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1210);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    this.camera.position.set(0, -0.4, 8.5);
    this.camera.lookAt(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // 3. Shared Materials
    this.sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8a882, // Warm natural wooden cardboard
      roughness: 0.8,
      metalness: 0.05,
    });

    this.frontMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.05,
    });

    // 4. Build Environment & Lighting
    this.setupLighting();
    this.setupTable(theme);

    // 5. Load Texture & Generate 3D Puzzle Pieces
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    textureLoader.load(imageSrc, (tex) => {
      if (this.isDestroyed) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      this.texture = tex;
      this.frontMaterial.map = tex;
      this.frontMaterial.needsUpdate = true;

      this.generatePieces(pieceCount, this.roomSeed);
      this.setupReferenceImage();
    });

    // 6. Bind Events
    this.bindEvents();

    // 7. Start Render Loop
    this.startLoop();
  }

  private setupLighting() {
    // Soft warm ambient fill
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.45);
    this.scene.add(ambientLight);

    // Primary downward desk spotlight with soft shadow
    const mainLight = new THREE.DirectionalLight(0xffeedd, 0.95);
    mainLight.position.set(2, 4, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.bias = -0.0005;
    this.scene.add(mainLight);

    // Soft cool fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xd4e2da, 0.3);
    fillLight.position.set(-4, -2, 6);
    this.scene.add(fillLight);
  }

  private setupTable(theme: TableTheme) {
    const tableGeometry = new THREE.PlaneGeometry(35, 25);

    let tableColor = 0x18241e;
    let tableRoughness = 0.6;

    if (theme === 'wood') {
      tableColor = 0x5a3c26;
      tableRoughness = 0.55;
    } else if (theme === 'coffee') {
      tableColor = 0x2b1d14;
      tableRoughness = 0.65;
    } else if (theme === 'night') {
      tableColor = 0x0e1319;
      tableRoughness = 0.7;
    }

    const tableMaterial = new THREE.MeshStandardMaterial({
      color: tableColor,
      roughness: tableRoughness,
      metalness: 0.05,
    });

    this.tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
    this.tableMesh.position.set(0, 0, -0.02);
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Central assembly board guidelines
    const hw = this.boardWidth / 2;
    const hh = this.boardHeight / 2;
    const boardPoints = [
      new THREE.Vector3(-hw, hh, 0.001),
      new THREE.Vector3(hw, hh, 0.001),
      new THREE.Vector3(hw, -hh, 0.001),
      new THREE.Vector3(-hw, -hh, 0.001),
      new THREE.Vector3(-hw, hh, 0.001),
    ];
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(boardPoints);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0xa3c6a5,
      transparent: true,
      opacity: 0.25,
    });
    this.boardOutlineMesh = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    this.scene.add(this.boardOutlineMesh);
  }

  private setupReferenceImage() {
    if (!this.texture) return;

    const refGeometry = new THREE.PlaneGeometry(this.boardWidth, this.boardHeight);
    const refMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.12,
    });

    this.referenceMesh = new THREE.Mesh(refGeometry, refMaterial);
    this.referenceMesh.position.set(0, 0, 0.0005);
    this.referenceMesh.visible = this.showReference;
    this.scene.add(this.referenceMesh);
  }

  /**
   * Deterministically generate puzzle piece geometries and scatter them organically.
   */
  public generatePieces(totalPieces: number, seed: string = this.roomSeed) {
    // Clear old pieces
    this.pieceMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.pieceHitBoxes.forEach((box) => this.scene.remove(box));
    this.pieceMeshes.clear();
    this.pieceHitBoxes.clear();
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

    // Generate complementary interlocking edge shapes
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

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 16,
    };

    const boardLeft = -this.boardWidth / 2;
    const boardTop = this.boardHeight / 2;

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

        const targetX = boardLeft + c * pieceW;
        const targetY = boardTop - r * pieceH;

        const piece: PuzzlePiece = {
          id,
          col: c,
          row: r,
          targetX,
          targetY,
          x: targetX,
          y: targetY,
          width: pieceW,
          height: pieceH,
          edges,
          groupId: id,
          isSnapped: false,
          heldBy: null,
        };
        this.pieces.push(piece);

        // 1. Create Extruded 3D Shape
        const shape = createJigsawShape(pieceW, pieceH, edges, this.tabSize);
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // 2. Custom UV Mapping: map exact slice of puzzle texture onto the front face
        const posAttr = geometry.attributes.position;
        const uvAttr = geometry.attributes.uv;

        for (let i = 0; i < posAttr.count; i++) {
          const localX = posAttr.getX(i);
          const localY = posAttr.getY(i); // ranges from -pieceH to 0

          const worldX = targetX + localX;
          const worldY = targetY + localY;

          // Normalized UV coordinate in [0, 1]
          const u = (worldX - boardLeft) / this.boardWidth;
          const v = (worldY - (boardTop - this.boardHeight)) / this.boardHeight;

          uvAttr.setXY(i, u, v);
        }
        uvAttr.needsUpdate = true;
        geometry.computeVertexNormals();

        // 3. Create Multi-material 3D Mesh
        const mesh = new THREE.Mesh(geometry, [this.frontMaterial, this.sideMaterial]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { pieceId: id };

        this.pieceMeshes.set(id, mesh);
        this.scene.add(mesh);

        // 4. Create Invisible Hit-box for blazing-fast cursor raycasting
        const hitBoxGeo = new THREE.PlaneGeometry(pieceW * 1.3, pieceH * 1.3);
        const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
        hitBox.position.set(pieceW / 2, -pieceH / 2, 0.02);
        hitBox.userData = { pieceId: id };
        mesh.add(hitBox);
        this.pieceHitBoxes.set(id, hitBox);
      }
    }

    // Apply organic scatter outside the central assembly board
    this.scatterUnsnapped(prng);
  }

  /**
   * Scatters unsnapped puzzle pieces naturally across the left, right, and bottom table areas.
   */
  public scatterUnsnapped(providedPrng?: () => number) {
    const prng = providedPrng || createPRNG(`${this.roomSeed}-${Date.now()}`);
    const unsnapped = this.pieces.filter((p) => !p.isSnapped);
    if (unsnapped.length === 0) return [];

    const pieceW = unsnapped[0].width;
    const pieceH = unsnapped[0].height;

    const leftZone = { minX: -this.boardWidth * 0.95, maxX: -this.boardWidth * 0.58, minY: -2.0, maxY: 2.0 };
    const rightZone = { minX: this.boardWidth * 0.58, maxX: this.boardWidth * 0.95, minY: -2.0, maxY: 2.0 };
    const bottomZone = { minX: -this.boardWidth * 0.7, maxX: this.boardWidth * 0.7, minY: -this.boardHeight * 0.85, maxY: -this.boardHeight * 0.55 };

    const positions: { id: number; x: number; y: number }[] = [];

    unsnapped.forEach((p, idx) => {
      let zone = leftZone;
      if (idx % 3 === 1) zone = rightZone;
      else if (idx % 3 === 2) zone = bottomZone;

      const randX = zone.minX + prng() * (zone.maxX - zone.minX);
      const randY = zone.minY + prng() * (zone.maxY - zone.minY);

      p.x = randX;
      p.y = randY;
      p.isSnapped = false;

      // Layered Z-height so pieces never Z-fight or pierce each other
      const zHeight = 0.003 + idx * 0.001;

      const mesh = this.pieceMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.x, p.y, zHeight);
        mesh.rotation.z = (prng() - 0.5) * 0.02; // subtle natural tilt
      }
      positions.push({ id: p.id, x: p.x, y: p.y });
    });

    return positions;
  }

  public applyRemoteScatter(piecesData: { id: number; x: number; y: number }[]) {
    piecesData.forEach(({ id, x, y }) => {
      const p = this.pieces.find((piece) => piece.id === id);
      if (p) {
        p.x = x;
        p.y = y;
        p.isSnapped = false;
        const mesh = this.pieceMeshes.get(p.id);
        if (mesh) {
          mesh.position.set(x, y, 0.002);
        }
      }
    });
  }

  /**
   * Bind Pointer and Touch Events for 3D Dragging, Snapping, and Panning.
   */
  private bindEvents() {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    el.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // Double-click to detach a piece from its cluster
    el.addEventListener('dblclick', (e) => {
      this.updateMousePos(e);
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const hitBoxes = Array.from(this.pieceHitBoxes.values());
      const intersects = this.raycaster.intersectObjects(hitBoxes, false);
      if (intersects.length > 0) {
        const pieceId = intersects[0].object.userData.pieceId;
        const clickedPiece = this.pieces.find((p) => p.id === pieceId);
        if (clickedPiece) {
          this.detachPiece(clickedPiece);
        }
      }
    });

    // Right-click to detach a piece
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.updateMousePos(e);
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const hitBoxes = Array.from(this.pieceHitBoxes.values());
      const intersects = this.raycaster.intersectObjects(hitBoxes, false);
      if (intersects.length > 0) {
        const pieceId = intersects[0].object.userData.pieceId;
        const clickedPiece = this.pieces.find((p) => p.id === pieceId);
        if (clickedPiece) {
          this.detachPiece(clickedPiece);
        }
      }
    });
  }

  private updateMousePos(e: MouseEvent | PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getPlaneIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersection)) {
      return this.planeIntersection;
    }
    return null;
  }

  private onPointerDown(e: PointerEvent) {
    if (e.button === 1 || e.button === 2 || e.shiftKey || e.altKey) {
      // Pan mode
      this.isPanning = true;
      this.panStartMouse.set(e.clientX, e.clientY);
      this.panStartCamera.copy(this.camera.position);
      return;
    }

    this.updateMousePos(e);
    this.raycaster.setFromCamera(this.mousePos, this.camera);

    const hitBoxes = Array.from(this.pieceHitBoxes.values());
    const intersects = this.raycaster.intersectObjects(hitBoxes, false);

    if (intersects.length > 0) {
      const pieceId = intersects[0].object.userData.pieceId;
      const clickedPiece = this.pieces.find((p) => p.id === pieceId);

      if (clickedPiece && !clickedPiece.heldBy) {
        this.draggedPiece = clickedPiece;
        this.dragCluster = this.getConnectedCluster(clickedPiece);

        const worldPt = this.getPlaneIntersection();
        if (worldPt) {
          this.dragOffsets.clear();
          this.dragCluster.forEach((p) => {
            this.dragOffsets.set(p.id, {
              dx: p.x - worldPt.x,
              dy: p.y - worldPt.y,
            });

            // Elevate 3D mesh with tactile physical lift
            const mesh = this.pieceMeshes.get(p.id);
            if (mesh) {
              mesh.position.z = 0.08;
            }
          });
        }
      }
    } else {
      // Clicked on empty table -> Pan
      this.isPanning = true;
      this.panStartMouse.set(e.clientX, e.clientY);
      this.panStartCamera.copy(this.camera.position);
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (this.isPanning) {
      const dx = (e.clientX - this.panStartMouse.x) * 0.008 * (this.camera.position.z / 8.5);
      const dy = -(e.clientY - this.panStartMouse.y) * 0.008 * (this.camera.position.z / 8.5);
      this.camera.position.x = this.panStartCamera.x - dx;
      this.camera.position.y = this.panStartCamera.y - dy;
      return;
    }

    if (!this.draggedPiece) return;

    this.updateMousePos(e);
    const worldPt = this.getPlaneIntersection();
    if (!worldPt) return;

    // Move dragged piece and all connected cluster pieces
    const movedPieces: { pieceId: number; x: number; y: number }[] = [];

    this.dragCluster.forEach((p) => {
      const offset = this.dragOffsets.get(p.id);
      if (offset) {
        p.x = worldPt.x + offset.dx;
        p.y = worldPt.y + offset.dy;

        const mesh = this.pieceMeshes.get(p.id);
        if (mesh) {
          mesh.position.set(p.x, p.y, 0.08); // Tactile lifted elevation
        }

        movedPieces.push({ pieceId: p.id, x: p.x, y: p.y });
      }
    });

    // Throttled live drag broadcast
    const now = Date.now();
    if (now - this.lastDragBroadcast > 35) {
      this.lastDragBroadcast = now;
      this.onLiveDragCallback?.(movedPieces, this.currentUserName);
    }
  }

  private onPointerUp() {
    this.isPanning = false;

    if (!this.draggedPiece) return;

    // Check for magnetic snaps with neighbors and target assembly slots
    let didSnap = false;
    const SNAP_THRESHOLD = 0.22;

    this.dragCluster.forEach((p) => {
      // 1. Target Board Snap (absolute alignment)
      const distToTarget = Math.hypot(p.x - p.targetX, p.y - p.targetY);
      if (distToTarget < SNAP_THRESHOLD) {
        const deltaX = p.targetX - p.x;
        const deltaY = p.targetY - p.y;

        this.dragCluster.forEach((cp) => {
          cp.x += deltaX;
          cp.y += deltaY;
          cp.isSnapped = true;
        });

        didSnap = true;
      }
    });

    // 2. Physical Edge Contour Snapping (Allows complementary tabs & blanks to snap together even if mismatched)
    if (!didSnap) {
      for (const member of this.dragCluster) {
        for (const target of this.pieces) {
          if (this.dragCluster.includes(target)) continue;

          // 1. Member's RIGHT edge meets Target's LEFT edge
          if (member.edges.right === target.edges.left && member.edges.right !== 0) {
            const expectedTargetX = member.x + member.width;
            const expectedTargetY = member.y;
            const dist = Math.hypot(target.x - expectedTargetX, target.y - expectedTargetY);

            if (dist < SNAP_THRESHOLD) {
              const deltaX = target.x - expectedTargetX;
              const deltaY = target.y - expectedTargetY;
              this.dragCluster.forEach((p) => {
                p.x += deltaX;
                p.y += deltaY;
                if (target.isSnapped) p.isSnapped = true;
              });
              this.connectPieces(member, target);
              didSnap = true;
              break;
            }
          }

          // 2. Member's LEFT edge meets Target's RIGHT edge
          if (member.edges.left === target.edges.right && member.edges.left !== 0) {
            const expectedTargetX = member.x - target.width;
            const expectedTargetY = member.y;
            const dist = Math.hypot(target.x - expectedTargetX, target.y - expectedTargetY);

            if (dist < SNAP_THRESHOLD) {
              const deltaX = target.x - expectedTargetX;
              const deltaY = target.y - expectedTargetY;
              this.dragCluster.forEach((p) => {
                p.x += deltaX;
                p.y += deltaY;
                if (target.isSnapped) p.isSnapped = true;
              });
              this.connectPieces(member, target);
              didSnap = true;
              break;
            }
          }

          // 3. Member's BOTTOM edge meets Target's TOP edge
          if (member.edges.bottom === target.edges.top && member.edges.bottom !== 0) {
            const expectedTargetX = member.x;
            const expectedTargetY = member.y - member.height;
            const dist = Math.hypot(target.x - expectedTargetX, target.y - expectedTargetY);

            if (dist < SNAP_THRESHOLD) {
              const deltaX = target.x - expectedTargetX;
              const deltaY = target.y - expectedTargetY;
              this.dragCluster.forEach((p) => {
                p.x += deltaX;
                p.y += deltaY;
                if (target.isSnapped) p.isSnapped = true;
              });
              this.connectPieces(member, target);
              didSnap = true;
              break;
            }
          }

          // 4. Member's TOP edge meets Target's BOTTOM edge
          if (member.edges.top === target.edges.bottom && member.edges.top !== 0) {
            const expectedTargetX = member.x;
            const expectedTargetY = member.y + target.height;
            const dist = Math.hypot(target.x - expectedTargetX, target.y - expectedTargetY);

            if (dist < SNAP_THRESHOLD) {
              const deltaX = target.x - expectedTargetX;
              const deltaY = target.y - expectedTargetY;
              this.dragCluster.forEach((p) => {
                p.x += deltaX;
                p.y += deltaY;
                if (target.isSnapped) p.isSnapped = true;
              });
              this.connectPieces(member, target);
              didSnap = true;
              break;
            }
          }
        }
        if (didSnap) break;
      }
    }

    // Calculate realistic physical stacking Z-height for released cluster
    // If pieces are snapped to the board, they lock flush at baseline Z = 0.002
    // If unsnapped, calculate the highest piece underneath and stack physically on top (+0.026)
    let targetZ = 0.003;

    if (!didSnap) {
      let maxUnderZ = 0.002;
      const tab = this.tabSize * 1.1;

      this.dragCluster.forEach((p) => {
        const pMinX = p.x - tab;
        const pMaxX = p.x + p.width + tab;
        const pMinY = p.y - p.height - tab;
        const pMaxY = p.y + tab;

        this.pieces.forEach((other) => {
          if (this.dragCluster.includes(other)) return;

          const otherMesh = this.pieceMeshes.get(other.id);
          const otherZ = otherMesh ? otherMesh.position.z : 0.002;

          const oMinX = other.x - tab;
          const oMaxX = other.x + other.width + tab;
          const oMinY = other.y - other.height - tab;
          const oMaxY = other.y + tab;

          // Check 2D AABB bounding overlap
          const overlaps =
            pMinX < oMaxX && pMaxX > oMinX && pMinY < oMaxY && pMaxY > oMinY;

          if (overlaps) {
            maxUnderZ = Math.max(maxUnderZ, otherZ);
          }
        });
      });

      // If overlapping existing pieces on the table, sit precisely on top of the pile!
      if (maxUnderZ > 0.002) {
        targetZ = Math.min(0.25, maxUnderZ + 0.025);
      } else {
        targetZ = 0.004 + (Math.random() * 0.003);
      }
    } else {
      targetZ = 0.002; // Flush with the board
    }

    // Drop all cluster pieces to the calculated physical stacking elevation
    const releasedPieces: { pieceId: number; x: number; y: number; isSnapped: boolean }[] = [];

    this.dragCluster.forEach((p) => {
      const mesh = this.pieceMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.x, p.y, targetZ);
        // Subtle organic tilt if stacked on top of other pieces for tactile realism
        if (!didSnap && targetZ > 0.015) {
          mesh.rotation.z = (Math.random() - 0.5) * 0.03;
        } else {
          mesh.rotation.z = 0;
        }
      }
      releasedPieces.push({ pieceId: p.id, x: p.x, y: p.y, isSnapped: p.isSnapped });
    });

    if (didSnap) {
      this.onSnapCallback?.(this.draggedPiece);
    }

    this.onLiveReleaseCallback?.(releasedPieces);

    // Check Victory condition (all pieces snapped or in correct relative cluster)
    this.checkVictory();

    this.draggedPiece = null;
    this.dragCluster = [];
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    const newZ = THREE.MathUtils.clamp(this.camera.position.z * zoomFactor, 3.5, 18.0);
    this.camera.position.z = newZ;
  }

  private getConnectedCluster(piece: PuzzlePiece): PuzzlePiece[] {
    const visited = new Set<number>();
    const queue = [piece.id];
    visited.add(piece.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const neighbors = this.connections.get(currentId) || new Set();

      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    return this.pieces.filter((p) => visited.has(p.id));
  }

  public connectPieces(p1: PuzzlePiece, p2: PuzzlePiece) {
    if (p1.id === p2.id) return;
    if (!this.connections.has(p1.id)) this.connections.set(p1.id, new Set());
    if (!this.connections.has(p2.id)) this.connections.set(p2.id, new Set());
    this.connections.get(p1.id)?.add(p2.id);
    this.connections.get(p2.id)?.add(p1.id);
    p1.isSnapped = true;
    p2.isSnapped = true;
  }

  public detachPiece(piece: PuzzlePiece): boolean {
    const neighbors = this.connections.get(piece.id);
    if (!neighbors || neighbors.size === 0) return false;

    for (const neighborId of neighbors) {
      this.connections.get(neighborId)?.delete(piece.id);
      const otherPiece = this.pieces.find((p) => p.id === neighborId);
      if (otherPiece) {
        const otherNeighbors = this.connections.get(neighborId);
        otherPiece.isSnapped = !!otherNeighbors && otherNeighbors.size > 0;
      }
    }
    neighbors.clear();
    piece.isSnapped = false;

    // Shift piece slightly to visually separate
    piece.x += (Math.random() - 0.5) * 0.4;
    piece.y += (Math.random() - 0.5) * 0.4;
    const mesh = this.pieceMeshes.get(piece.id);
    if (mesh) {
      mesh.position.set(piece.x, piece.y, 0.015);
    }

    if (this.onDetachCallback) {
      this.onDetachCallback(piece);
    }
    return true;
  }

  private checkVictory() {
    if (this.pieces.length === 0) return;
    const cluster = this.getConnectedCluster(this.pieces[0]);
    if (cluster.length !== this.pieces.length) return;

    const root = this.pieces[0];
    const tolerance = 0.12;

    for (const p of this.pieces) {
      const expectedRelX = p.targetX - root.targetX;
      const expectedRelY = p.targetY - root.targetY;
      const actualRelX = p.x - root.x;
      const actualRelY = p.y - root.y;

      if (
        Math.abs(actualRelX - expectedRelX) > tolerance ||
        Math.abs(actualRelY - expectedRelY) > tolerance
      ) {
        return; // Some pieces are mechanically attached but incorrectly placed!
      }
    }

    this.onVictoryCallback?.();
  }

  private playerBadges: Map<string, THREE.Sprite> = new Map();

  private getPlayerBadge(userName: string): THREE.Sprite {
    let sprite = this.playerBadges.get(userName);
    if (!sprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Elevated soft shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      // Draw cozy pill background
      const text = `${userName} is moving`;
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const pillWidth = Math.min(480, textWidth + 80);
      const pillHeight = 64;
      const pillX = (512 - pillWidth) / 2;
      const pillY = (128 - pillHeight) / 2;

      ctx.fillStyle = 'rgba(120, 138, 117, 0.95)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 32);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, pillX + 40, pillY + 44);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });

      sprite = new THREE.Sprite(material);
      sprite.scale.set(1.4, 0.35, 1);
      sprite.renderOrder = 999;
      this.scene.add(sprite);
      this.playerBadges.set(userName, sprite);
    }
    return sprite;
  }

  /**
   * Realtime Sync Handler for Remote Peer Drags with floating badge indicator.
   */
  public applyRemoteDrag(movedPieces: { pieceId: number; x: number; y: number }[], heldBy: string) {
    if (movedPieces.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    movedPieces.forEach(({ pieceId, x, y }) => {
      const p = this.pieces.find((piece) => piece.id === pieceId);
      if (p && p !== this.draggedPiece) {
        p.x = x;
        p.y = y;
        p.heldBy = heldBy;

        const mesh = this.pieceMeshes.get(p.id);
        if (mesh) {
          mesh.position.set(x, y, 0.08); // Remote lifted state
        }

        if (x < minX) minX = x;
        if (x + p.width > maxX) maxX = x + p.width;
        if (y > maxY) maxY = y;
      }
    });

    // Position the floating player badge above the held cluster
    if (heldBy && minX !== Infinity) {
      const badge = this.getPlayerBadge(heldBy);
      const centerX = (minX + maxX) / 2;
      badge.position.set(centerX, maxY + 0.38, 0.22);
      badge.visible = true;
    }
  }

  public applyRemoteRelease(piecesData: { pieceId: number; x: number; y: number; isSnapped: boolean }[], heldBy?: string) {
    piecesData.forEach(({ pieceId, x, y, isSnapped }) => {
      const p = this.pieces.find((piece) => piece.id === pieceId);
      if (p) {
        p.x = x;
        p.y = y;
        p.isSnapped = isSnapped;
        p.heldBy = null;

        const mesh = this.pieceMeshes.get(p.id);
        if (mesh) {
          mesh.position.set(x, y, isSnapped ? 0.002 : 0.005);
        }
      }
    });

    if (heldBy) {
      const badge = this.playerBadges.get(heldBy);
      if (badge) {
        badge.visible = false;
      }
      this.pieces.forEach((p) => {
        if (p.heldBy === heldBy) p.heldBy = null;
      });
    }
  }

  public applyBoardSync(piecesData: { id: number; x: number; y: number; isSnapped: boolean; connections?: number[] }[]) {
    piecesData.forEach(({ id, x, y, isSnapped, connections }) => {
      const p = this.pieces.find((piece) => piece.id === id);
      if (p) {
        p.x = x;
        p.y = y;
        p.isSnapped = isSnapped;
        if (connections) {
          this.connections.set(id, new Set(connections));
        }
        const mesh = this.pieceMeshes.get(p.id);
        if (mesh) {
          mesh.position.set(x, y, 0.002);
        }
      }
    });
  }

  public exportBoardState() {
    return this.pieces.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      isSnapped: p.isSnapped,
      connections: Array.from(this.connections.get(p.id) || []),
    }));
  }

  public resize(width: number, height: number) {
    if (this.isDestroyed || width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public zoom(factor: number) {
    if (this.camera) {
      const newZ = THREE.MathUtils.clamp(this.camera.position.z / factor, 3.5, 18.0);
      this.camera.position.z = newZ;
    }
  }

  public resetView() {
    if (this.camera) {
      this.camera.position.set(0, -0.4, 8.5);
      this.camera.lookAt(0, 0, 0);
    }
  }

  public updateTheme(theme: TableTheme) {
    if (!this.tableMesh) return;
    let tableColor = 0x18241e;
    let tableRoughness = 0.6;

    if (theme === 'wood') {
      tableColor = 0x5a3c26;
      tableRoughness = 0.55;
    } else if (theme === 'coffee') {
      tableColor = 0x2b1d14;
      tableRoughness = 0.65;
    } else if (theme === 'night') {
      tableColor = 0x0e1319;
      tableRoughness = 0.7;
    }

    (this.tableMesh.material as THREE.MeshStandardMaterial).color.setHex(tableColor);
    (this.tableMesh.material as THREE.MeshStandardMaterial).roughness = tableRoughness;
  }

  public toggleReference(show: boolean) {
    this.showReference = show;
    if (this.referenceMesh) {
      this.referenceMesh.visible = show;
    }
  }

  private startLoop() {
    const loop = () => {
      if (this.isDestroyed) return;
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Dispose all meshes, geometries, and textures
    this.pieceMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      this.scene.remove(mesh);
    });
    this.pieceMeshes.clear();
    this.pieceHitBoxes.clear();

    this.playerBadges.forEach((sprite) => {
      if (sprite.material.map) sprite.material.map.dispose();
      sprite.material.dispose();
      this.scene.remove(sprite);
    });
    this.playerBadges.clear();

    if (this.texture) this.texture.dispose();
    this.frontMaterial.dispose();
    this.sideMaterial.dispose();
    this.renderer.dispose();
  }
}
