'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

const GLOBE_RADIUS = 1.35;

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0012;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    }
  });

  const nodes = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const phi = Math.acos(-1 + (2 * i) / 20);
      const theta = Math.sqrt(20 * Math.PI) * phi;
      const nodeR = GLOBE_RADIUS + 0.03;
      return {
        id: i,
        pos: [
          nodeR * Math.cos(theta) * Math.sin(phi),
          nodeR * Math.sin(theta) * Math.sin(phi),
          nodeR * Math.cos(phi)
        ] as [number, number, number],
        isGreen: i % 3 === 0,
      };
    });
  }, []);

  return (
    <group ref={meshRef}>
      <Sphere args={[GLOBE_RADIUS, 48, 48]}>
        <meshBasicMaterial color="#f1f5f9" transparent opacity={0.95} wireframe={false} />
      </Sphere>
      <Sphere args={[GLOBE_RADIUS + 0.01, 24, 24]}>
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.25} />
      </Sphere>
      {/* Decorative Nodes representing edge regions */}
      {nodes.map((n) => (
        <mesh key={n.id} position={n.pos}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={n.isGreen ? "#10b981" : "#2563eb"} />
        </mesh>
      ))}
    </group>
  );
}

export function NetworkGlobe() {
  return (
    <div className="w-full h-[240px] sm:h-[260px] flex items-center justify-center relative">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 45 }}>
        <GlobeMesh />
      </Canvas>
    </div>
  );
}
