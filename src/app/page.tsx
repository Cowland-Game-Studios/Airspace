'use client';

import dynamic from 'next/dynamic';
import { Dashboard } from '@/components/Dashboard';
import { DataPoller } from '@/components/DataPoller';
import { useRadarStore } from '@/store/gameStore';

const Scene = dynamic(() => import('@/components/Scene').then((mod) => mod.Scene), {
  ssr: false,
  loading: () => null, // We handle loading ourselves
});

function LoadingOverlay() {
  const locationReady = useRadarStore((s) => s.locationReady);
  
  return (
    <div 
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center font-mono transition-opacity duration-700 pointer-events-none ${
        locationReady ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDelay: locationReady ? '200ms' : '0ms' }}
    >
      <div className="text-center">
        <div className="mb-4 text-[#333] text-xs tracking-[0.2em]">
          INITIALIZING SYSTEM
        </div>
        <div className="mt-4 text-[10px] text-[#444] tracking-[0.15em]">
          ACQUIRING_LOCATION...
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <Scene />
      <Dashboard />
      <DataPoller />
      <LoadingOverlay />
    </main>
  );
}
