'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function AbstractCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      wireframeRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial 
          color="#000000" 
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      <mesh ref={wireframeRef} scale={1.2}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial 
          color="#3b82f6" 
          wireframe={true} 
          transparent={true} 
          opacity={0.3} 
        />
      </mesh>
    </Float>
  );
}

function Debris() {
  const group = useRef<THREE.Group>(null);
  const debrisCount = 40;

  const positions = useMemo(() => {
    const pos = new Float32Array(debrisCount * 3);
    for (let i = 0; i < debrisCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
      group.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: debrisCount }).map((_, i) => (
        <mesh 
          key={i} 
          position={[positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]}
        >
          <octahedronGeometry args={[0.1 * Math.random() + 0.05]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      ))}
    </group>
  );
}

export function NotFoundScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={['#030712']} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#3b82f6" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />
        
        <AbstractCore />
        <Debris />
        
        <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={100} scale={12} size={2} speed={0.4} opacity={0.2} color="#60a5fa" />
      </Canvas>
    </div>
  );
}
