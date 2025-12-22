'use client';

import { useEffect, useMemo } from 'react';
import { EntityType } from '@/types/entities';
import { useRadarStore } from '@/store/gameStore';

interface ModeBarProps {
  onModeChange?: (mode: EntityType | 'all') => void;
}

// SVG Icons
const PlaneIcon = ({ active }: { active: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? '#00ff88' : '#555'} strokeWidth="2">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);

const RunwayIcon = ({ active }: { active: boolean }) => (
  <span className={`text-sm font-bold ${active ? 'text-[#00ff88]' : 'text-[#555]'}`}>═</span>
);

const MissileIcon = ({ active }: { active: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? '#00ff88' : '#555'} strokeWidth="2">
    <path d="M4 20L12 12M12 12L20 4M12 12L8 8M12 12L16 16"/>
    <circle cx="20" cy="4" r="2"/>
  </svg>
);

const AllIcon = ({ active }: { active: boolean }) => (
  <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-[#00ff88]' : 'bg-[#555]'}`} />
);

export function ModeBar({ onModeChange }: ModeBarProps) {
  const activeMode = useRadarStore((s) => s.gameState.activeMode);
  const setActiveMode = useRadarStore((s) => s.setActiveMode);
  const aircraft = useRadarStore((s) => s.aircraft);
  const airports = useRadarStore((s) => s.airports);
  
  const modes = useMemo<('all' | 'aircraft' | 'airport' | 'missile')[]>(() => ['all', 'aircraft', 'airport'], []);
  
  const counts: Record<string, number> = {
    all: aircraft.length + airports.length,
    aircraft: aircraft.length,
    airport: airports.length,
    missile: 0,
  };
  
  // Cycle through modes with bracket keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get current mode from store directly to avoid stale closure
      const current = useRadarStore.getState().gameState.activeMode;
      
      if (e.key === '[') {
        e.preventDefault();
        e.stopPropagation();
        const currentIdx = modes.indexOf(current);
        const nextIdx = (currentIdx - 1 + modes.length) % modes.length;
        const nextMode = modes[nextIdx];
        setActiveMode(nextMode);
        onModeChange?.(nextMode);
      } else if (e.key === ']') {
        e.preventDefault();
        e.stopPropagation();
        const currentIdx = modes.indexOf(current);
        const nextIdx = (currentIdx + 1) % modes.length;
        const nextMode = modes[nextIdx];
        setActiveMode(nextMode);
        onModeChange?.(nextMode);
      }
    };
    
    // Use capture phase to intercept before text inputs
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [modes, onModeChange, setActiveMode]);
  
  const getIcon = (mode: EntityType | 'all', active: boolean) => {
    switch (mode) {
      case 'aircraft': return <PlaneIcon active={active} />;
      case 'airport': return <RunwayIcon active={active} />;
      case 'missile': return <MissileIcon active={active} />;
      case 'all': return <AllIcon active={active} />;
      default: return <AllIcon active={active} />;
    }
  };
  
  const getLabel = (mode: EntityType | 'all') => {
    switch (mode) {
      case 'aircraft': return 'AIRCRAFT';
      case 'airport': return 'AIRPORTS';
      case 'missile': return 'MISSILES';
      case 'all': return 'ALL';
      default: return mode.toUpperCase();
    }
  };
  
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="text-[#444]">[</span>
      
      <div className="flex items-center gap-1 bg-black/80 border border-[#222] px-2 py-1">
        {modes.map((mode) => {
          const isActive = activeMode === mode;
          const count = counts[mode] || 0;
          
          return (
            <button
              key={mode}
              onClick={() => {
                setActiveMode(mode);
                onModeChange?.(mode);
              }}
              className={`flex items-center gap-1.5 px-1.5 py-0.5 transition-all ${
                isActive ? 'bg-[#111]' : 'hover:bg-[#0a0a0a]'
              }`}
            >
              {getIcon(mode, isActive)}
              {isActive && (
                <>
                  <span className="text-[#00ff88]">{count}</span>
                  <span className="text-white">{getLabel(mode)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      
      <span className="text-[#444]">] to cycle</span>
    </div>
  );
}
