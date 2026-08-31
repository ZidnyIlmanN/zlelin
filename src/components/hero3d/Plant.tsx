'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Creates a chunky, smooth stylized leaf mesh.
 */
function Leaf({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  scale = [1, 1, 1] as [number, number, number],
  color = '#4E7350',
}) {
  const leafGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Smooth teardrop leaf shape
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.045, 0.05, 0.075, 0.14, 0.05, 0.25);
    shape.bezierCurveTo(0.03, 0.32, -0.03, 0.32, -0.05, 0.25);
    shape.bezierCurveTo(-0.075, 0.14, -0.045, 0.05, 0, 0);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
      curveSegments: 12,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <mesh
      geometry={leafGeometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Stylized potted jade/succulent plant in a terracotta ceramic pot.
 * Positioned on top of the wooden tabletop at Y = 0.0 on the right side.
 */
export function Plant() {
  // Smooth terracotta pot profile resting at Y = 0
  const potGeometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    // Base resting flat at Y = 0
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.11, 0));
    points.push(new THREE.Vector2(0.125, 0.02));
    // Tapering body
    points.push(new THREE.Vector2(0.145, 0.1));
    points.push(new THREE.Vector2(0.165, 0.2));
    // Top rim
    points.push(new THREE.Vector2(0.175, 0.235));
    points.push(new THREE.Vector2(0.17, 0.25));
    points.push(new THREE.Vector2(0.155, 0.245));
    // Inner wall
    points.push(new THREE.Vector2(0.14, 0.2));
    points.push(new THREE.Vector2(0.1, 0.05));
    points.push(new THREE.Vector2(0, 0.04));

    return new THREE.LatheGeometry(points, 24);
  }, []);

  return (
    <group position={[0.92, 0.0, 0.14]}>
      {/* Terracotta Pot */}
      <mesh geometry={potGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#BA7452"
          roughness={0.75}
          metalness={0.02}
        />
      </mesh>

      {/* Dark Soil */}
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.145, 18]} />
        <meshStandardMaterial
          color="#3A281A"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Chunky Leaves arranged in a lush, stylized fan */}
      <group position={[0, 0.23, 0]}>
        {/* Leaf 1: Center tall */}
        <Leaf
          position={[0, 0, 0]}
          rotation={[0.1, 0, 0]}
          scale={[1.1, 1.2, 1.1]}
          color="#4E7350"
        />
        {/* Leaf 2: Front-left tilt */}
        <Leaf
          position={[-0.04, 0, 0.04]}
          rotation={[0.45, -0.4, 0.35]}
          scale={[1.0, 1.05, 1.0]}
          color="#5A835C"
        />
        {/* Leaf 3: Front-right tilt */}
        <Leaf
          position={[0.04, 0, 0.04]}
          rotation={[0.45, 0.4, -0.35]}
          scale={[1.0, 1.05, 1.0]}
          color="#466C48"
        />
        {/* Leaf 4: Back-left spread */}
        <Leaf
          position={[-0.05, 0.02, -0.03]}
          rotation={[-0.35, -1.1, 0.4]}
          scale={[0.95, 1.0, 0.95]}
          color="#3E6140"
        />
        {/* Leaf 5: Back-right spread */}
        <Leaf
          position={[0.05, 0.02, -0.03]}
          rotation={[-0.35, 1.1, -0.4]}
          scale={[0.95, 1.0, 0.95]}
          color="#567E58"
        />
      </group>
    </group>
  );
}
