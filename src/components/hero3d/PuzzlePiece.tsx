'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface PuzzlePieceProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  scale?: number;
  /**
   * Defines the 4 edges: [top, right, bottom, left]
   * 1 = outward tab, -1 = inward hole, 0 = straight border edge
   */
  tabs?: [number, number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Creates an authentic, stylized jigsaw puzzle piece shape.
 * Features classic round bulbous tabs and round socket holes with smooth curves.
 */
function createJigsawShape(size: number, tabs: [number, number, number, number]): THREE.Shape {
  const shape = new THREE.Shape();
  const half = size / 2;
  const tabR = size * 0.18; // tab radius
  const neckW = size * 0.12; // neck width

  // Start at bottom-left corner
  shape.moveTo(-half, -half);

  // 1. Bottom edge (from -half to +half on X, at Y = -half)
  if (tabs[2] === 0) {
    shape.lineTo(half, -half);
  } else {
    const dir = tabs[2]; // 1 = outward (down), -1 = inward (up)
    shape.lineTo(-neckW, -half);
    shape.bezierCurveTo(
      -neckW, -half - dir * (tabR * 0.3),
      -tabR * 1.3, -half - dir * (tabR * 0.7),
      -tabR * 1.1, -half - dir * (tabR * 1.4)
    );
    shape.bezierCurveTo(
      -tabR * 0.6, -half - dir * (tabR * 2.1),
      tabR * 0.6, -half - dir * (tabR * 2.1),
      tabR * 1.1, -half - dir * (tabR * 1.4)
    );
    shape.bezierCurveTo(
      tabR * 1.3, -half - dir * (tabR * 0.7),
      neckW, -half - dir * (tabR * 0.3),
      neckW, -half
    );
    shape.lineTo(half, -half);
  }

  // 2. Right edge (from -half to +half on Y, at X = half)
  if (tabs[1] === 0) {
    shape.lineTo(half, half);
  } else {
    const dir = tabs[1]; // 1 = outward (right), -1 = inward (left)
    shape.lineTo(half, -neckW);
    shape.bezierCurveTo(
      half + dir * (tabR * 0.3), -neckW,
      half + dir * (tabR * 0.7), -tabR * 1.3,
      half + dir * (tabR * 1.4), -tabR * 1.1
    );
    shape.bezierCurveTo(
      half + dir * (tabR * 2.1), -tabR * 0.6,
      half + dir * (tabR * 2.1), tabR * 0.6,
      half + dir * (tabR * 1.4), tabR * 1.1
    );
    shape.bezierCurveTo(
      half + dir * (tabR * 0.7), tabR * 1.3,
      half + dir * (tabR * 0.3), neckW,
      half, neckW
    );
    shape.lineTo(half, half);
  }

  // 3. Top edge (from +half to -half on X, at Y = half)
  if (tabs[0] === 0) {
    shape.lineTo(-half, half);
  } else {
    const dir = tabs[0]; // 1 = outward (up), -1 = inward (down)
    shape.lineTo(neckW, half);
    shape.bezierCurveTo(
      neckW, half + dir * (tabR * 0.3),
      tabR * 1.3, half + dir * (tabR * 0.7),
      tabR * 1.1, half + dir * (tabR * 1.4)
    );
    shape.bezierCurveTo(
      tabR * 0.6, half + dir * (tabR * 2.1),
      -tabR * 0.6, half + dir * (tabR * 2.1),
      -tabR * 1.1, half + dir * (tabR * 1.4)
    );
    shape.bezierCurveTo(
      -tabR * 1.3, half + dir * (tabR * 0.7),
      -neckW, half + dir * (tabR * 0.3),
      -neckW, half
    );
    shape.lineTo(-half, half);
  }

  // 4. Left edge (from +half to -half on Y, at X = -half)
  if (tabs[3] === 0) {
    shape.lineTo(-half, -half);
  } else {
    const dir = -tabs[3];
    shape.lineTo(-half, neckW);
    shape.bezierCurveTo(
      -half - dir * (tabR * 0.3), neckW,
      -half - dir * (tabR * 0.7), tabR * 1.3,
      -half - dir * (tabR * 1.4), tabR * 1.1
    );
    shape.bezierCurveTo(
      -half - dir * (tabR * 2.1), tabR * 0.6,
      -half - dir * (tabR * 2.1), -tabR * 0.6,
      -half - dir * (tabR * 1.4), -tabR * 1.1
    );
    shape.bezierCurveTo(
      -half - dir * (tabR * 0.7), -tabR * 1.3,
      -half - dir * (tabR * 0.3), -neckW,
      -half, -neckW
    );
    shape.lineTo(-half, -half);
  }

  return shape;
}

export function PuzzlePiece({
  position = [0, 0.003, 0],
  rotation = [0, 0, 0],
  color = '#E8DDD0',
  scale = 1,
  tabs = [1, -1, 0, 1],
  castShadow = true,
  receiveShadow = true,
}: PuzzlePieceProps) {
  const geometry = useMemo(() => {
    const shape = createJigsawShape(0.44, tabs);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 3,
      curveSegments: 16,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [tabs]);

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={[-Math.PI / 2 + (rotation[0] || 0), rotation[1] || 0, rotation[2] || 0]}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.65}
        metalness={0.05}
      />
    </mesh>
  );
}
