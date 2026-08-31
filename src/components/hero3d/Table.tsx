'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * A stylized cozy wooden table top slab with continuous smooth rounded corners and beveled edges.
 * Compact floating proportions: Width = 2.9, Depth = 1.45, Thickness = 0.12.
 * The top surface is mathematically calibrated to sit exactly at Y = 0.0.
 */
export function Table() {
  const depth = 0.09;
  const bevel = 0.015;

  const tableGeometry = useMemo(() => {
    const width = 2.9;
    const tableDepth = 1.45;
    const radius = 0.22; // Smooth rounded corners
    const shape = new THREE.Shape();
    const hw = width / 2;
    const hd = tableDepth / 2;

    // Rounded rectangle on X-Y plane
    shape.moveTo(-hw + radius, -hd);
    shape.lineTo(hw - radius, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + radius);
    shape.lineTo(hw, hd - radius);
    shape.quadraticCurveTo(hw, hd, hw - radius, hd);
    shape.lineTo(-hw + radius, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - radius);
    shape.lineTo(-hw, -hd + radius);
    shape.quadraticCurveTo(-hw, -hd, -hw + radius, -hd);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 24,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* Seamless rounded wooden table slab: top surface sits precisely at Y = 0.0 */}
      <mesh
        geometry={tableGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -(depth + bevel), 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          color="#754E35"
          roughness={0.56}
          metalness={0.03}
        />
      </mesh>
    </group>
  );
}
