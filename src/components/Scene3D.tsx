"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────
   SLINKY TORUS — Clean round donut of rings

   The trick: use TubeGeometry along a circular
   curve for each ring, then place each ring at
   even intervals around the torus center.
   Each ring is simply a circle (torus with tiny
   tube) rotated to face outward from center.
   ───────────────────────────────────────────── */

function SlinkyTorus({
  scrollProgress,
  mouse,
}: {
  scrollProgress: number;
  mouse: React.RefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringsGroupRef = useRef<THREE.Group>(null!);

  const NUM = 44;
  const MAJOR_R = 0.9; // distance from center to each ring center (tight hole)
  const RING_R = 0.45; // radius of each individual ring (narrow slinky)
  const WIRE = 0.012;  // wire thickness

  // Material
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        metalness: 1.0,
        roughness: 0.06,
        color: new THREE.Color("#3a5565"),
        iridescence: 1.0,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 400],
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
      }),
    []
  );

  // Geometry (shared)
  const ringGeo = useMemo(
    () => new THREE.TorusGeometry(RING_R, WIRE, 8, 64),
    []
  );

  // Store refs to each ring mesh
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mx = mouse.current?.x ?? 0;
    const my = mouse.current?.y ?? 0;

    if (!groupRef.current) return;

    // ── Whole group: angled tilt + mouse parallax + continuous rotation ──
    groupRef.current.rotation.x +=
      (my * 0.1 + 0.95 - groupRef.current.rotation.x) * 0.02;
    groupRef.current.rotation.y += 0.003; // steady continuous spin
    groupRef.current.rotation.z +=
      (mx * 0.08 + 0.35 - groupRef.current.rotation.z) * 0.02;

    // Scroll position
    groupRef.current.position.y +=
      (0.2 - scrollProgress * 4 - groupRef.current.position.y) * 0.03;

    // Scale: starts small, grows on scroll
    const target = 0.85 + scrollProgress * 2.2;
    const s = Math.min(3.2, target);
    groupRef.current.scale.setScalar(
      groupRef.current.scale.x + (s - groupRef.current.scale.x) * 0.03
    );

    // ── Per-ring: keep perfect circle, no position/rotation changes ──
    // Rings stay exactly where they were placed.
    // The whole group rotation handles all movement.
  });

  return (
    <group ref={groupRef} position={[0, 0.2, 0]} rotation={[0.95, 0, 0.35]}>
      <group ref={ringsGroupRef}>
        {Array.from({ length: NUM }).map((_, i) => {
          const angle = (i / NUM) * Math.PI * 2;
          return (
            <mesh
              key={i}
              ref={(el) => { meshRefs.current[i] = el; }}
              geometry={ringGeo}
              material={material}
              position={[
                MAJOR_R * Math.cos(angle),
                0,
                MAJOR_R * Math.sin(angle),
              ]}
              rotation={[Math.PI / 2, 0, angle]}
            />
          );
        })}
      </group>
    </group>
  );
}

/* ─── Silver Stardust — mouse-interactive ─── */

function Stardust({
  scrollProgress,
  mouse,
}: {
  scrollProgress: number;
  mouse: React.RefObject<{ x: number; y: number }>;
}) {
  const ref = useRef<THREE.Points>(null!);
  const COUNT = 500;

  // Store base positions and velocities
  const base = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Spread across a wide field
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
      // Slow drift velocity
      velocities[i * 3] = (Math.random() - 0.5) * 0.003;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    }
    return { positions, velocities };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(base.positions.slice(), 3));
    return g;
  }, [base]);

  useFrame((state) => {
    if (!ref.current) return;
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    const mx = mouse.current?.x ?? 0;
    const my = mouse.current?.y ?? 0;

    // Convert mouse to world-ish coordinates
    const mouseX = mx * 8;
    const mouseY = my * 5;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Base drift
      posArr[ix] += base.velocities[ix];
      posArr[iy] += base.velocities[iy];
      posArr[iz] += base.velocities[iz];

      // Subtle sine wave float
      posArr[iy] += Math.sin(t * 0.3 + i * 0.1) * 0.0005;

      // Mouse repulsion — particles push away from cursor
      const dx = posArr[ix] - mouseX;
      const dy = posArr[iy] - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3) {
        const force = (3 - dist) * 0.004;
        posArr[ix] += (dx / dist) * force;
        posArr[iy] += (dy / dist) * force;
      }

      // Wrap around edges
      if (posArr[ix] > 10) posArr[ix] = -10;
      if (posArr[ix] < -10) posArr[ix] = 10;
      if (posArr[iy] > 7) posArr[iy] = -7;
      if (posArr[iy] < -7) posArr[iy] = 7;
      if (posArr[iz] > 6) posArr[iz] = -6;
      if (posArr[iz] < -6) posArr[iz] = 6;
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = t * 0.003;
    ref.current.scale.setScalar(1 + scrollProgress * 0.15);
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.02}
        color="#C0D0D8"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ─── Mouse light ─── */

function MouseLight({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(() => {
    if (ref.current && mouse.current) {
      ref.current.position.x += (mouse.current.x * 7 - ref.current.position.x) * 0.03;
      ref.current.position.y += (mouse.current.y * 4 - ref.current.position.y) * 0.03;
    }
  });
  return <pointLight ref={ref} color="#7ECFD6" intensity={12} distance={20} position={[0, 0, 5]} />;
}

/* ─── Renderer ─── */

function Setup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.3;
  }, [gl]);
  return null;
}

/* ─── Scene ─── */

function Scene({ scrollProgress, mouse }: {
  scrollProgress: number;
  mouse: React.RefObject<{ x: number; y: number }>;
}) {
  return (
    <>
      <color attach="background" args={["#0a0812"]} />
      <fog attach="fog" args={["#0a0812", 10, 25]} />
      <Setup />

      {/* Strong lighting for chrome reflections */}
      <ambientLight intensity={0.5} color="#6AAFBA" />
      <directionalLight position={[5, 5, 5]} intensity={3} color="#D0E8F0" />
      <directionalLight position={[-5, 3, -3]} intensity={2} color="#5BB8C4" />
      <directionalLight position={[0, -3, -5]} intensity={1.2} color="#3A7A8A" />
      <pointLight position={[-4, 4, -3]} intensity={15} color="#2A6A7A" distance={20} />
      <pointLight position={[4, -2, 4]} intensity={10} color="#1A5A6A" distance={18} />
      <pointLight position={[0, 3, 3]} intensity={12} color="#4A9AAA" distance={15} />
      <spotLight position={[0, 8, 3]} intensity={18} angle={0.5} penumbra={0.9} color="#7ECFD6" distance={25} />
      <MouseLight mouse={mouse} />

      <SlinkyTorus scrollProgress={scrollProgress} mouse={mouse} />
      <Stardust scrollProgress={scrollProgress} mouse={mouse} />
    </>
  );
}

/* ─── Export ─── */

export default function Scene3D({ scrollProgress }: { scrollProgress: number }) {
  const mouse = useRef({ x: 0, y: 0 });
  const onMove = useCallback((e: React.MouseEvent) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  return (
    <div className="canvas-container" onMouseMove={onMove}>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }} dpr={[1, 1.5]}>
        <Scene scrollProgress={scrollProgress} mouse={mouse} />
      </Canvas>
    </div>
  );
}
