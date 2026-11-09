'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function NetworkVisualization({ variant = 'landing' }: { variant?: 'landing' | 'auth' }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    // Position camera so the globe is large and prominent
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent for white theme
    el.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    
    let innerCube: THREE.Mesh | null = null;
    let cubeGeo: THREE.BoxGeometry | null = null;
    let cubeMat: THREE.MeshBasicMaterial | null = null;

    if (variant === 'auth') {
      // Offset the globe to the left half so the form on the right has clear focus
      globeGroup.position.x = W > 1024 ? -5 : 0;
      
      // ── 0. Add the inner Cube for auth page ──
      cubeGeo = new THREE.BoxGeometry(10, 10, 10);
      cubeMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      });
      innerCube = new THREE.Mesh(cubeGeo, cubeMat);
      globeGroup.add(innerCube);
    }
    
    scene.add(globeGroup);

    // ── 1. Create the Sphere of Points (Fibonacci distribution) ──
    const POINT_COUNT = 1600;
    const GLOBE_RADIUS = 15;
    const pointsPos = new Float32Array(POINT_COUNT * 3);
    const goldenRatio = 1 + Math.sqrt(5);

    for (let i = 0; i < POINT_COUNT; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / POINT_COUNT);
      const theta = Math.PI * goldenRatio * i;
      pointsPos[i * 3]     = Math.cos(theta) * Math.sin(phi) * GLOBE_RADIUS;
      pointsPos[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * GLOBE_RADIUS;
      pointsPos[i * 3 + 2] = Math.cos(phi) * GLOBE_RADIUS;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointsPos, 3));
    
    // Custom soft circular dot texture
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    const dotTexture = new THREE.CanvasTexture(canvas);

    const pointsMat = new THREE.PointsMaterial({
      color: 0x94a3b8, // slate-400 (subtle blue-gray on white)
      size: 0.15,
      map: dotTexture,
      transparent: true,
      opacity: 0.35,
      alphaTest: 0.01,
      depthWrite: false
    });
    const globePoints = new THREE.Points(pointsGeo, pointsMat);
    globeGroup.add(globePoints);

    // ── 2. Create Arcs (Network Traffic) ──
    const ARC_COUNT = 24;
    const arcs: {
      curve: THREE.CubicBezierCurve3;
      mesh: THREE.Line;
      packet: THREE.Mesh;
      progress: number;
      speed: number;
    }[] = [];

    const packetGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const packetMatOk = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // vibrant green
    const packetMatErr = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // vibrant red
    
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6, // bright blue
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });

    const curveGeometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < ARC_COUNT; i++) {
      const idxA = Math.floor(Math.random() * POINT_COUNT);
      let idxB = Math.floor(Math.random() * POINT_COUNT);
      while(idxA === idxB) idxB = Math.floor(Math.random() * POINT_COUNT);

      const pA = new THREE.Vector3(pointsPos[idxA*3], pointsPos[idxA*3+1], pointsPos[idxA*3+2]);
      const pB = new THREE.Vector3(pointsPos[idxB*3], pointsPos[idxB*3+1], pointsPos[idxB*3+2]);

      const dist = pA.distanceTo(pB);
      const mid = pA.clone().add(pB).multiplyScalar(0.5);
      // Bulge curve outward based on distance
      mid.normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.35);

      const c1 = pA.clone().lerp(mid, 0.5).normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.25);
      const c2 = pB.clone().lerp(mid, 0.5).normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.25);
      const curve = new THREE.CubicBezierCurve3(pA, c1, c2, pB);

      const curvePts = curve.getPoints(32);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
      curveGeometries.push(curveGeo);
      const lineMesh = new THREE.Line(curveGeo, lineMat);
      globeGroup.add(lineMesh);

      const isErr = Math.random() < 0.08;
      const packet = new THREE.Mesh(packetGeo, isErr ? packetMatErr : packetMatOk);
      globeGroup.add(packet);

      arcs.push({
        curve,
        mesh: lineMesh,
        packet,
        progress: Math.random(),
        speed: 0.0006 + Math.random() * 0.0009
      });
    }

    // ── 3. Mouse Interaction (tilt globe) ──
    let mx = 0, my = 0;
    let targetX = 0, targetY = 0;
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / W - 0.5) * 2;
      my = (e.clientY / H - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    
    const onResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (variant === 'auth') {
        globeGroup.position.x = w > 1024 ? -5 : 0;
      }
    };
    window.addEventListener('resize', onResize);

    // ── 4. Viewport visibility handling to save battery and prevent scroll lag ──
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(el);

    // ── Animation Loop ──
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return; // Do not waste GPU cycles when scrolled past hero

      // Gentle continuous rotation
      globeGroup.rotation.y += 0.0004;
      globeGroup.rotation.x += 0.00015;
      
      // Rotate inner cube in opposite direction (auth variant only)
      if (innerCube) {
        innerCube.rotation.y -= 0.001;
        innerCube.rotation.z += 0.0005;
      }

      // Smooth mouse parallax tilt
      targetX = mx * 0.2;
      targetY = my * 0.2;
      scene.rotation.x += (targetY - scene.rotation.x) * 0.04;
      scene.rotation.y += (targetX - scene.rotation.y) * 0.04;

      // Animate packets along precomputed arcs (zero reallocation = zero lag!)
      for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];
        arc.progress += arc.speed;
        if (arc.progress >= 1) {
          arc.progress = 0;
          arc.packet.material = Math.random() < 0.08 ? packetMatErr : packetMatOk;
        }

        const pt = arc.curve.getPoint(arc.progress);
        arc.packet.position.copy(pt);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      renderer.dispose();
      dotTexture.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      if (cubeGeo) cubeGeo.dispose();
      if (cubeMat) cubeMat.dispose();
      packetGeo.dispose();
      packetMatOk.dispose();
      packetMatErr.dispose();
      lineMat.dispose();
      curveGeometries.forEach(g => g.dispose());
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}
