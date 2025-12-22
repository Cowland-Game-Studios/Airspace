'use client';

import { useRadarStore } from '@/store/gameStore';
import { useEffect, useCallback } from 'react';
import { EntityInfoPanel } from './entities/EntityInfoPanel';
import { SearchBar } from './SearchBar';
import { ModeBar } from './ModeBar';

export function Dashboard() {
  const gameState = useRadarStore((state) => state.gameState);
  const selectEntity = useRadarStore((state) => state.selectEntity);

  const handleClosePanel = useCallback(() => {
    selectEntity(null);
  }, [selectEntity]);

  // Keyboard shortcuts: ESC to unfollow, ENTER to track/switch hovered entity
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'Escape') {
        handleClosePanel();
      } else if (e.key === 'Enter' && gameState.hoveredEntity) {
        selectEntity(gameState.hoveredEntity);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClosePanel, gameState.hoveredEntity, selectEntity]);

  return (
    <div className="absolute inset-0 pointer-events-none font-mono">
      {/* Entity Info Panel - Bottom Left */}
      <div className="absolute bottom-14 left-4 pointer-events-auto">
        <EntityInfoPanel onClose={handleClosePanel} />
      </div>
      
      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mode Bar */}
          <ModeBar />
          
          {/* Center: Search Bar */}
          <div className="flex-1 max-w-md">
            <SearchBar />
          </div>
          
          {/* Right: Version */}
          <span className="text-[10px] text-[#333]">v0.1.2</span>
        </div>
      </div>
    </div>
  );
}
