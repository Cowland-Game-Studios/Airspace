'use client';

import { Canvas } from '@react-three/fiber';
import { Stars, PerspectiveCamera, AdaptiveDpr } from '@react-three/drei';
import { Globe } from './Globe';
import { CountryBorders } from './CountryBorders';
import { AircraftLayerInstanced } from './AircraftLayerInstanced';
import { AirportsLayer } from './AirportsLayer';
import { CameraController } from './CameraController';
import { ViewportTracker } from './ViewportTracker';
import { Suspense } from 'react';
import { COLORS, CAMERA } from '@/config/constants';

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={COLORS.GLOBE_SURFACE} wireframe />
    </mesh>
  );
}

export function Scene() {
  return (
    <div className="w-screen h-screen absolute inset-0 overflow-hidden" style={{ touchAction: 'none' }}>
      <Canvas
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        resize={{ scroll: false, debounce: { scroll: 50, resize: 50 } }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        <color attach="background" args={[COLORS.BG_DARK]} />
        <PerspectiveCamera makeDefault position={[0, 0, CAMERA.DEFAULT_DISTANCE]} fov={60} />
        <AdaptiveDpr pixelated />
        <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={0.2} />
        <Suspense fallback={<LoadingFallback />}>
          <Globe />
          <CountryBorders />
          <AirportsLayer />
          <AircraftLayerInstanced />
        </Suspense>
        <CameraController />
        <ViewportTracker />
      </Canvas>
    </div>
  );
}
