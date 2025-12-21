'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAirspaceStore } from '@/store/gameStore';

function generateMockData(count: number = 100) {
  const aircraft = [];
  for (let i = 0; i < count; i++) {
    aircraft.push({
      id: `MOCK${i.toString().padStart(4, '0')}`,
      callsign: `${['UAL', 'DAL', 'AAL', 'SWA', 'JBU', 'ASA'][Math.floor(Math.random() * 6)]}${Math.floor(Math.random() * 9999)}`,
      type: 'B737',
      position: {
        latitude: (Math.random() - 0.5) * 140,
        longitude: (Math.random() - 0.5) * 360,
        altitude: 25000 + Math.random() * 20000,
        heading: Math.random() * 360,
        speed: 400 + Math.random() * 200,
      },
      timestamp: Date.now(),
    });
  }
  return aircraft;
}

export function DataPoller() {
  const isPolling = useAirspaceStore((state) => state.isPolling);
  const setAircraft = useAirspaceStore((state) => state.setAircraft);
  const aircraft = useAirspaceStore((state) => state.aircraft);
  const hasInitialized = useRef(false);
  
  const fetchData = useCallback(async () => {
    if (!isPolling) return;
    try {
      const res = await fetch('https://opensky-network.org/api/states/all', {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error('API error');
      const text = await res.text();
      if (!text || !text.startsWith('{')) throw new Error('Invalid JSON');
      const data = JSON.parse(text);
      if (data.states && data.states.length > 0) {
        const planes = data.states.filter((s: any[]) => s[5] != null && s[6] != null).slice(0, 300).map((s: any[]) => ({
          id: s[0],
          callsign: (s[1] || 'UNKNOWN').trim() || 'N/A',
          type: 'UNKNOWN',
          position: { longitude: s[5], latitude: s[6], altitude: (s[7] || 0) * 3.28084, heading: s[10] || 0, speed: (s[9] || 0) * 1.94384 },
          timestamp: Date.now(),
        }));
        if (planes.length > 0) { setAircraft(planes); return; }
      }
      throw new Error('No data');
    } catch (e) {
      console.log('Using mock data');
      if (aircraft.length === 0) setAircraft(generateMockData());
    }
  }, [isPolling, setAircraft, aircraft.length]);
  
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchData();
    }
  }, [fetchData]);
  
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [isPolling, fetchData]);
  
  return null;
}
