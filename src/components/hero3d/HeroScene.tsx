'use client';

import React, { useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Table } from './Table';
import { Lamp } from './Lamp';
import { Mug } from './Mug';
import { Plant } from './Plant';
import { PuzzleCluster } from './PuzzleCluster';
import { DustParticles } from './DustParticles';

/**
 * Camera rig with gentle, elegant mouse parallax.
 */
function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const currentPos = useRef(new THREE.Vector3(0, 1.25, 2.7));
  const baseTarget = useRef(new THREE.Vector3(0, 0.16, 0));

  const handlePointerMove = useCallback((e: PointerEvent) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, []);

  React.useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [handlePointerMove]);

  useFrame(() => {
    // Gentle target calculation
    const targetX = mouse.current.x * 0.1;
    const targetY = 1.25 - mouse.current.y * 0.05;

    currentPos.current.x += (targetX - currentPos.current.x) * 0.04;
    currentPos.current.y += (targetY - currentPos.current.y) * 0.04;

    camera.position.set(currentPos.current.x, currentPos.current.y, 2.7);
    camera.lookAt(baseTarget.current.x + currentPos.current.x * 0.2, baseTarget.current.y, baseTarget.current.z);
  });

  return null;
}

/**
 * All 3D objects composed together.
 */
function SceneContent() {
  return (
    <>
      <CameraRig />

      {/* Gentle warm ambient lighting */}
      <ambientLight intensity={0.35} color="#FFE6C2" />

      {/* Soft directional fill from upper right */}
      <directionalLight
        position={[2.5, 3.0, 1.5]}
        intensity={0.25}
        color="#D0DED4"
      />

      {/* Soft background fill */}
      <hemisphereLight
        color="#FFE8CC"
        groundColor="#0B100E"
        intensity={0.2}
      />

      {/* 3D Scene Components */}
      <Table />
      <Lamp />
      <Mug />
      <Plant />
      <PuzzleCluster />
      <DustParticles />
    </>
  );
}

/**
 * Main 3D Hero Scene Canvas with 100% transparent background for seamless integration.
 */
export function HeroScene() {
  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          fov: 34,
          near: 0.1,
          far: 20,
          position: [0, 1.25, 2.7],
        }}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        {/* Transparent Canvas: blends 100% seamlessly with outer hero background */}
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
