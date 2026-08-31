'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DUST_COUNT = 36;

/**
 * 4-Point Golden Diamond Sparkle Star (matches the reference image ✨ stars in background)
 */
function SparkleStar({ position, scale = 1, delay = 0 }: { position: [number, number, number]; scale?: number; delay?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const s = 0.04 * scale;
    const inner = s * 0.2;

    shape.moveTo(0, s);
    shape.quadraticCurveTo(0, inner, inner, 0);
    shape.quadraticCurveTo(0, inner, s, 0);
    shape.quadraticCurveTo(inner, 0, 0, -s);
    shape.quadraticCurveTo(0, -inner, -inner, 0);
    shape.quadraticCurveTo(0, -inner, -s, 0);
    shape.quadraticCurveTo(-inner, 0, 0, s);

    return new THREE.ShapeGeometry(shape);
  }, [scale]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime + delay;
    const pulse = 0.6 + Math.sin(t * 1.8) * 0.35;
    meshRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <mesh ref={meshRef} geometry={starShape} position={position}>
      <meshBasicMaterial
        color="#FFE59E"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Floating glowing golden dust particles + 4-point sparkle stars scattered in the night sky.
 */
export function DustParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const spd = new Float32Array(DUST_COUNT);
    const phs = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.0;
      pos[i * 3 + 1] = 0.1 + Math.random() * 1.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

      spd[i] = 0.2 + Math.random() * 0.4;
      phs[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, speeds: spd, phases: phs };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < DUST_COUNT; i++) {
      const idx = i * 3;
      posAttr.array[idx + 1] += Math.sin(t * speeds[i] + phases[i]) * 0.0004;
      posAttr.array[idx] += Math.cos(t * speeds[i] * 0.7 + phases[i]) * 0.0003;
    }
    posAttr.needsUpdate = true;
  });

  // Fixed sparkle star positions
  const stars: Array<{ pos: [number, number, number]; scale: number; delay: number }> = useMemo(() => [
    { pos: [-1.25, 0.95, -0.3], scale: 1.2, delay: 0.2 },
    { pos: [-0.95, 0.5, 0.2], scale: 0.8, delay: 1.5 },
    { pos: [-0.55, 1.15, -0.2], scale: 0.9, delay: 2.8 },
    { pos: [0.55, 1.25, -0.3], scale: 1.1, delay: 0.8 },
    { pos: [1.15, 0.85, -0.2], scale: 1.3, delay: 3.2 },
    { pos: [1.35, 0.45, 0.1], scale: 0.9, delay: 1.9 },
    { pos: [-0.15, 0.45, 0.35], scale: 0.7, delay: 4.1 },
    { pos: [0.38, 0.5, 0.25], scale: 0.75, delay: 2.3 },
  ], []);

  return (
    <group>
      {/* Floating glowing points */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={DUST_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#FFD680"
          size={0.024}
          transparent
          opacity={0.65}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Sparkle diamond stars */}
      {stars.map((star, i) => (
        <SparkleStar
          key={i}
          position={star.pos}
          scale={star.scale}
          delay={star.delay}
        />
      ))}
    </group>
  );
}
