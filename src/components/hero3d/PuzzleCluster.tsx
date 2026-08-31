'use client';

import React from 'react';
import { PuzzlePiece } from './PuzzlePiece';

interface PieceData {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  tabs: [number, number, number, number];
  scale: number;
}

/**
 * Realistic layered pile of jigsaw puzzle pieces resting on the table and overlapping each other,
 * directly illuminated by the warm desk lamp.
 */
const PIECES: PieceData[] = [
  // --- Layer 1: Bottom pieces resting flat on table surface (Y = 0.003) ---
  {
    position: [-0.26, 0.003, 0.12],
    rotation: [0, 0, 0.45],
    color: '#8CA4B3', // Muted sky/lake blue
    tabs: [-1, 1, 1, -1],
    scale: 0.95,
  },
  {
    position: [0.18, 0.003, 0.26],
    rotation: [0, 0, -0.45],
    color: '#6B8968', // Forest sage green
    tabs: [0, -1, 1, 1],
    scale: 0.88,
  },
  {
    position: [-0.04, 0.003, -0.1],
    rotation: [0, 0, -0.3],
    color: '#E8DCB8', // Sand cream
    tabs: [1, 1, -1, 0],
    scale: 0.9,
  },
  {
    position: [0.46, 0.003, 0.12],
    rotation: [0, 0, -0.35],
    color: '#D8CBB8', // Light beige
    tabs: [1, -1, 1, 0],
    scale: 0.86,
  },

  // --- Layer 2: Mid pieces overlapping on top of Layer 1 (Y = 0.025 with subtle physical tilt) ---
  {
    position: [-0.1, 0.025, 0.08],
    rotation: [0.03, 0.02, 0.15],
    color: '#EFE5D5', // Cream
    tabs: [1, -1, 1, 0],
    scale: 0.95,
  },
  {
    position: [0.22, 0.025, 0.12],
    rotation: [-0.02, 0.02, -0.1],
    color: '#E2D4C0', // Sand beige
    tabs: [0, 1, -1, 1],
    scale: 0.92,
  },
  {
    position: [0.36, 0.025, -0.04],
    rotation: [0.02, -0.02, 0.55],
    color: '#EAE1D0', // Cream
    tabs: [-1, 1, 0, 1],
    scale: 0.88,
  },
  {
    position: [-0.18, 0.025, -0.16],
    rotation: [-0.02, 0.03, 0.75],
    color: '#5C7A58', // Deep sage green
    tabs: [1, 0, -1, -1],
    scale: 0.84,
  },

  // --- Layer 3: Topmost centerpiece resting on top of the pile in the warm beam (Y = 0.048) ---
  {
    position: [0.04, 0.048, 0.14],
    rotation: [0.03, -0.02, 0.22],
    color: '#F4ECE0', // Soft warm highlight cream
    tabs: [1, -1, -1, 1],
    scale: 0.96,
  },
];

export function PuzzleCluster() {
  return (
    <group position={[0.0, 0.0, 0.0]}>
      {PIECES.map((piece, i) => (
        <PuzzlePiece
          key={i}
          position={piece.position}
          rotation={piece.rotation}
          color={piece.color}
          tabs={piece.tabs}
          scale={piece.scale}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
