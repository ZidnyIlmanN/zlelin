'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Chunky stylized ceramic coffee mug sitting on top of the table on the left side.
 * Color: Pastel sage green with smooth ceramic finish and dark roasted coffee inside.
 */
export function Mug() {
  const bodyGeometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    // Base resting flat at Y = 0
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.11, 0));
    points.push(new THREE.Vector2(0.125, 0.015));
    // Outer wall with subtle organic barrel curve
    points.push(new THREE.Vector2(0.135, 0.08));
    points.push(new THREE.Vector2(0.14, 0.17));
    points.push(new THREE.Vector2(0.138, 0.25));
    // Soft rounded top rim
    points.push(new THREE.Vector2(0.135, 0.27));
    points.push(new THREE.Vector2(0.125, 0.275));
    points.push(new THREE.Vector2(0.115, 0.265));
    // Inner wall
    points.push(new THREE.Vector2(0.11, 0.17));
    points.push(new THREE.Vector2(0.105, 0.04));
    // Inner floor
    points.push(new THREE.Vector2(0, 0.03));

    return new THREE.LatheGeometry(points, 24);
  }, []);

  // Curved handle on the left side
  const handleGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.125, 0.21, 0),
      new THREE.Vector3(-0.21, 0.18, 0),
      new THREE.Vector3(-0.23, 0.13, 0),
      new THREE.Vector3(-0.2, 0.08, 0),
      new THREE.Vector3(-0.12, 0.06, 0),
    ]);
    return new THREE.TubeGeometry(curve, 18, 0.02, 10, false);
  }, []);

  return (
    <group position={[-0.92, 0.0, 0.18]}>
      {/* Ceramic Mug Body */}
      <mesh geometry={bodyGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#8FA893"
          roughness={0.42}
          metalness={0.05}
        />
      </mesh>

      {/* Chunky Handle */}
      <mesh geometry={handleGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#8FA893"
          roughness={0.42}
          metalness={0.05}
        />
      </mesh>

      {/* Coffee Surface */}
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.11, 20]} />
        <meshStandardMaterial
          color="#2B1A0E"
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}
