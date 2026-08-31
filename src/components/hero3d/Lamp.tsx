'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Desk lamp with arched neck, bell shade pointing straight down,
 * glowing bulb, and a direct vertical spotlight illuminating the puzzle pile.
 */
export function Lamp() {
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const bulbRef = useRef<THREE.Mesh>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  // Spotlight target placed right at the center of the puzzle cluster
  const targetObject = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(-0.05, 0.0, 0.12);
    return obj;
  }, []);

  useEffect(() => {
    if (spotlightRef.current) {
      spotlightRef.current.target = targetObject;
    }
  }, [targetObject]);

  // Subtle breathing/flicker animation for cozy living ambience
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = Math.sin(t * 1.5) * 0.08 + Math.sin(t * 3.7) * 0.04;

    if (spotlightRef.current) {
      spotlightRef.current.intensity = 5.8 + flicker * 2;
    }
    if (bulbRef.current) {
      const mat = bulbRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.5 + flicker * 0.5;
    }
    if (coneRef.current) {
      const mat = coneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.07 + flicker * 0.01;
    }
  });

  // Smooth curved neck arm from base to shade
  const neckCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.45, 0.02, -0.15),
      new THREE.Vector3(-0.45, 0.38, -0.12),
      new THREE.Vector3(-0.38, 0.68, -0.02),
      new THREE.Vector3(-0.25, 0.82, 0.06),
      new THREE.Vector3(-0.05, 0.78, 0.12),
    ]);
  }, []);

  const neckGeometry = useMemo(() => {
    return new THREE.TubeGeometry(neckCurve, 24, 0.02, 12, false);
  }, [neckCurve]);

  // Bell/dome shade profile using LatheGeometry
  const shadeGeometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    // Top socket
    points.push(new THREE.Vector2(0.04, 0.16));
    points.push(new THREE.Vector2(0.05, 0.14));
    points.push(new THREE.Vector2(0.07, 0.1));
    // Dome body
    points.push(new THREE.Vector2(0.12, 0.04));
    points.push(new THREE.Vector2(0.18, -0.02));
    // Flare rim
    points.push(new THREE.Vector2(0.22, -0.08));
    points.push(new THREE.Vector2(0.225, -0.095));
    // Inner wall
    points.push(new THREE.Vector2(0.21, -0.09));
    points.push(new THREE.Vector2(0.165, -0.02));
    points.push(new THREE.Vector2(0.11, 0.04));
    points.push(new THREE.Vector2(0.05, 0.1));
    points.push(new THREE.Vector2(0.03, 0.15));

    return new THREE.LatheGeometry(points, 24);
  }, []);

  // Volumetric beam cone extending straight down to tabletop
  const coneGeometry = useMemo(() => {
    // Top radius 0.21, bottom radius 0.72, height 0.72
    const geo = new THREE.CylinderGeometry(0.21, 0.72, 0.72, 24, 1, true);
    geo.translate(0, -0.36, 0);
    return geo;
  }, []);

  return (
    <group>
      {/* Target object for spotlight */}
      <primitive object={targetObject} />

      {/* 1. Base Disc resting on top of table at Y = 0 */}
      <mesh position={[-0.45, 0.015, -0.15]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 24]} />
        <meshStandardMaterial
          color="#38302A"
          roughness={0.65}
          metalness={0.15}
        />
      </mesh>
      {/* Base accent socket */}
      <mesh position={[-0.45, 0.035, -0.15]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.015, 16]} />
        <meshStandardMaterial
          color="#483F37"
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Curved Stem */}
      <mesh geometry={neckGeometry} castShadow>
        <meshStandardMaterial
          color="#38302A"
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* 3. Joint / Hinge */}
      <mesh position={[-0.05, 0.78, 0.12]} castShadow>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial
          color="#4A3F35"
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      {/* 4. Shade + Light Group — pointed straight down with subtle forward tilt for bulb visibility */}
      <group position={[-0.05, 0.75, 0.12]} rotation={[0.12, 0, 0]}>
        {/* Shade outer shell */}
        <mesh geometry={shadeGeometry} castShadow>
          <meshStandardMaterial
            color="#342D26"
            roughness={0.6}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Glowing bulb inside shade mouth */}
        <mesh ref={bulbRef} position={[0, -0.03, 0]}>
          <sphereGeometry args={[0.072, 16, 16]} />
          <meshStandardMaterial
            color="#FFF8EB"
            emissive="#FFB547"
            emissiveIntensity={2.5}
            roughness={0.2}
            metalness={0.0}
          />
        </mesh>

        {/* SpotLight shining directly down onto puzzle cluster */}
        <spotLight
          ref={spotlightRef}
          position={[0, -0.03, 0]}
          angle={0.65}
          penumbra={0.75}
          intensity={5.8}
          color="#FFCA7A"
          distance={4.0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        {/* Local PointLight for warm radiant glow */}
        <pointLight
          position={[0, -0.05, 0]}
          intensity={2.2}
          distance={2.8}
          color="#FFD185"
        />

        {/* Volumetric warm light beam cone pointing directly down */}
        <mesh
          ref={coneRef}
          geometry={coneGeometry}
          position={[0, -0.08, 0]}
        >
          <meshBasicMaterial
            color="#FFD285"
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
