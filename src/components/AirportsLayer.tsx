'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useRadarStore, Airport } from '@/store/gameStore';
import { GLOBE, AIRPORTS, COLORS } from '@/config/constants';
import { calculateViewVisibility } from '@/utils/lod';

// Re-export for backwards compatibility
export { calculateViewVisibility };

function latLonToVector3(lat: number, lon: number): THREE.Vector3 {
  const r = GLOBE.AIRPORT_SURFACE_OFFSET;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const AIRPORT_ANIM_DURATION = 1.2; // Total stagger duration
const AIRPORT_RIPPLE_DURATION = 0.5; // Individual airport pop duration
const AIRPORT_OVERSHOOT = 1.6; // How much bigger before settling
const OPACITY_SMOOTH_FACTOR = 4; // How fast opacity transitions

// Ripple ease: starts big, settles to 1.0
function rippleEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Overshoot then settle
  const overshoot = AIRPORT_OVERSHOOT;
  const decay = Math.pow(1 - t, 2);
  return 1 + (overshoot - 1) * decay * Math.sin(t * Math.PI);
}

// Instanced mesh for large airports with hover support
function LargeAirportsInstanced({ airports }: { airports: Airport[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const hoverEntity = useRadarStore((state) => state.hoverEntity);
  const selectEntity = useRadarStore((state) => state.selectEntity);
  const hoveredEntity = useRadarStore((state) => state.gameState.hoveredEntity);
  const hoveredAirport = hoveredEntity?.type === 'airport' ? hoveredEntity.id : null;
  const introPhase = useRadarStore((state) => state.introPhase);
  
  const animationTime = useRef(0);
  const animationStarted = useRef(false);
  
  // Per-instance smooth opacity tracking
  const instanceOpacities = useRef<number[]>([]);
  
  const positions = useMemo(() => {
    return airports.map(airport => latLonToVector3(airport.lat, airport.lon));
  }, [airports]);
  
  // Initialize opacity array when airports change
  useEffect(() => {
    instanceOpacities.current = new Array(airports.length).fill(0);
  }, [airports.length]);
  
  // Pre-calculate delays for staggered animation (top-left to bottom-right)
  const staggerDelays = useMemo(() => {
    return airports.map(airport => {
      // Normalize longitude from -180..180 to 0..1
      const normalizedLon = (airport.lon + 180) / 360;
      // Normalize latitude from 90..-90 to 0..1 (north to south)
      const normalizedLat = (90 - airport.lat) / 180;
      // Combine: diagonal from top-left to bottom-right
      const diagonal = (normalizedLon + normalizedLat) / 2;
      return diagonal * AIRPORT_ANIM_DURATION;
    });
  }, [airports]);
  
  // Create a map from instance index to airport icao
  const indexToIcao = useMemo(() => {
    return airports.map(a => a.icao);
  }, [airports]);
  
  // Update instance matrices with staggered ripple animation
  useFrame((_, delta) => {
    if (!meshRef.current || positions.length === 0) return;
    
    // Start animation when airports phase begins
    if (introPhase === 'airports' || introPhase === 'aircraft' || introPhase === 'complete') {
      if (!animationStarted.current) {
        animationStarted.current = true;
        animationTime.current = 0;
      }
    }
    
    // Animate time
    if (animationStarted.current) {
      animationTime.current += delta;
    }
    
    // Find hovered airport
    const hoveredIdx = hoveredAirport ? indexToIcao.indexOf(hoveredAirport) : -1;
    
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 0, 1);
    let maxProgress = 0;
    
    // Ensure opacity array is correct size
    if (instanceOpacities.current.length !== positions.length) {
      instanceOpacities.current = new Array(positions.length).fill(0);
    }
    
    const smoothFactor = Math.min(delta * OPACITY_SMOOTH_FACTOR, 0.25);
    
    positions.forEach((pos, i) => {
      dummy.position.copy(pos);
      const normal = pos.clone().normalize();
      dummy.quaternion.setFromUnitVectors(up, normal);
      
      // Calculate individual progress based on stagger delay
      const delay = staggerDelays[i];
      const individualTime = Math.max(0, animationTime.current - delay);
      const individualProgress = Math.min(1, individualTime / AIRPORT_RIPPLE_DURATION);
      maxProgress = Math.max(maxProgress, individualProgress);
      
      // Ripple scale: starts at 0, pops up bigger, then settles to 1
      const rippleScale = animationStarted.current ? rippleEase(individualProgress) : 0;
      
      // Calculate view-based visibility (lazy loading effect)
      const targetVisibility = calculateViewVisibility(pos, camera);
      
      // Smooth transition for visibility (fade in/out)
      instanceOpacities.current[i] += (targetVisibility - instanceOpacities.current[i]) * smoothFactor;
      const smoothVisibility = instanceOpacities.current[i];
      
      // Scale is ripple * smooth visibility (airports fade in/out smoothly)
      dummy.scale.setScalar(rippleScale * smoothVisibility);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Update material opacity based on overall progress
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.min(0.9, maxProgress);
  });
  
  // Update colors based on hover state (green when hovered)
  useEffect(() => {
    if (!meshRef.current) return;
    
    const color = new THREE.Color();
    const hoveredIdx = hoveredAirport ? indexToIcao.indexOf(hoveredAirport) : -1;
    
    for (let i = 0; i < airports.length; i++) {
      if (i === hoveredIdx) {
        color.set(COLORS.AIRPORT_HOVERED);
      } else {
        color.set(COLORS.AIRPORT_DEFAULT);
      }
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [hoveredAirport, airports.length, indexToIcao]);
  
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && indexToIcao[e.instanceId]) {
      hoverEntity({ type: 'airport', id: indexToIcao[e.instanceId] });
    }
  };
  
  const handlePointerOut = () => {
    hoverEntity(null);
  };
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && indexToIcao[e.instanceId]) {
      selectEntity({ type: 'airport', id: indexToIcao[e.instanceId] });
    }
  };
  
  if (airports.length === 0) return null;
  
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, airports.length]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <planeGeometry args={[AIRPORTS.LARGE_AIRPORT_SIZE, AIRPORTS.LARGE_AIRPORT_SIZE]} />
      <meshBasicMaterial 
        color="#ffffff" 
        transparent 
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// Instanced mesh for small/medium airports with hover support
function SmallAirportsInstanced({ airports }: { airports: Airport[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const hoverEntity = useRadarStore((state) => state.hoverEntity);
  const selectEntity = useRadarStore((state) => state.selectEntity);
  const hoveredEntity = useRadarStore((state) => state.gameState.hoveredEntity);
  const hoveredAirport = hoveredEntity?.type === 'airport' ? hoveredEntity.id : null;
  const introPhase = useRadarStore((state) => state.introPhase);
  
  const animationTime = useRef(0);
  const animationStarted = useRef(false);
  
  // Per-instance smooth opacity tracking
  const instanceOpacities = useRef<number[]>([]);
  
  const positions = useMemo(() => {
    return airports.map(airport => latLonToVector3(airport.lat, airport.lon));
  }, [airports]);
  
  // Initialize opacity array when airports change
  useEffect(() => {
    instanceOpacities.current = new Array(airports.length).fill(0);
  }, [airports.length]);
  
  // Pre-calculate delays for staggered animation (top-left to bottom-right)
  const staggerDelays = useMemo(() => {
    return airports.map(airport => {
      const normalizedLon = (airport.lon + 180) / 360;
      const normalizedLat = (90 - airport.lat) / 180;
      const diagonal = (normalizedLon + normalizedLat) / 2;
      return diagonal * AIRPORT_ANIM_DURATION;
    });
  }, [airports]);
  
  const indexToIcao = useMemo(() => {
    return airports.map(a => a.icao);
  }, [airports]);
  
  // Update colors based on hover state - dim non-hovered when one is selected
  useEffect(() => {
    if (!meshRef.current) return;
    
    const color = new THREE.Color();
    const hoveredIdx = hoveredAirport ? indexToIcao.indexOf(hoveredAirport) : -1;
    const hasHover = hoveredIdx >= 0;
    
    for (let i = 0; i < airports.length; i++) {
      if (i === hoveredIdx) {
        color.set(COLORS.AIRPORT_HOVERED);
      } else if (hasHover) {
        // Dim other airports when one is hovered
        color.set('#333333');
      } else {
        color.set(COLORS.AIRPORT_DEFAULT);
      }
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [hoveredAirport, airports.length, indexToIcao]);
  
  useFrame((_, delta) => {
    if (!meshRef.current || positions.length === 0) return;
    
    // Start animation when airports phase begins
    if (introPhase === 'airports' || introPhase === 'aircraft' || introPhase === 'complete') {
      if (!animationStarted.current) {
        animationStarted.current = true;
        animationTime.current = 0;
      }
    }
    
    // Animate time
    if (animationStarted.current) {
      animationTime.current += delta;
    }
    
    // Opacity logic
    const cameraDistance = camera.position.length();
    const baseOpacity = Math.max(0, Math.min(1, (AIRPORTS.SMALL_AIRPORT_FADE_DISTANCE - cameraDistance) * AIRPORTS.SMALL_AIRPORT_FADE_SPEED));
    
    // Find hovered airport index
    const hoveredIdx = hoveredAirport ? indexToIcao.indexOf(hoveredAirport) : -1;
    const hasHoveredSmallAirport = hoveredIdx >= 0;
    
    // Update instance matrices with staggered ripple animation
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 0, 1);
    let maxProgress = 0;
    
    // Ensure opacity array is correct size
    if (instanceOpacities.current.length !== positions.length) {
      instanceOpacities.current = new Array(positions.length).fill(0);
    }
    
    const smoothFactor = Math.min(delta * OPACITY_SMOOTH_FACTOR, 0.25);
    
    positions.forEach((pos, i) => {
      dummy.position.copy(pos);
      const normal = pos.clone().normalize();
      dummy.quaternion.setFromUnitVectors(up, normal);
      
      // Calculate individual progress based on stagger delay
      const delay = staggerDelays[i];
      const individualTime = Math.max(0, animationTime.current - delay);
      const individualProgress = Math.min(1, individualTime / AIRPORT_RIPPLE_DURATION);
      maxProgress = Math.max(maxProgress, individualProgress);
      
      // Ripple scale
      const rippleScale = animationStarted.current ? rippleEase(individualProgress) : 0;
      
      // Calculate view-based visibility (lazy loading effect)
      const targetVisibility = calculateViewVisibility(pos, camera);
      
      // Smooth transition for visibility (fade in/out)
      instanceOpacities.current[i] += (targetVisibility - instanceOpacities.current[i]) * smoothFactor;
      const smoothVisibility = instanceOpacities.current[i];
      
      // Scale is ripple * smooth visibility (airports fade in/out smoothly)
      dummy.scale.setScalar(rippleScale * smoothVisibility);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    
    // Keep base opacity, but ensure layer is visible if something is hovered
    if (hasHoveredSmallAirport) {
      // Ensure minimum opacity so hovered airport is visible
      material.opacity = Math.max(0.8, baseOpacity * AIRPORTS.SMALL_AIRPORT_MAX_OPACITY) * maxProgress;
      meshRef.current.visible = maxProgress > 0.01;
    } else {
      material.opacity = baseOpacity * AIRPORTS.SMALL_AIRPORT_MAX_OPACITY * maxProgress;
      meshRef.current.visible = baseOpacity > 0.01 && maxProgress > 0.01;
    }
  });
  
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && indexToIcao[e.instanceId]) {
      hoverEntity({ type: 'airport', id: indexToIcao[e.instanceId] });
    }
  };
  
  const handlePointerOut = () => {
    hoverEntity(null);
  };
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && indexToIcao[e.instanceId]) {
      selectEntity({ type: 'airport', id: indexToIcao[e.instanceId] });
    }
  };
  
  if (airports.length === 0) return null;
  
  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, airports.length]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Simple square geometry - minimal triangles for performance */}
      <planeGeometry args={[AIRPORTS.SMALL_AIRPORT_SIZE, AIRPORTS.SMALL_AIRPORT_SIZE]} />
      <meshBasicMaterial 
        color="#ffffff" 
        transparent 
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export function AirportsLayer() {
  const airports = useRadarStore((state) => state.airports);
  const fetchAirports = useRadarStore((state) => state.fetchAirports);
  const locationReady = useRadarStore((state) => state.locationReady);
  
  // Fetch airports when location is ready
  useEffect(() => {
    if (locationReady) {
      fetchAirports();
    }
  }, [locationReady, fetchAirports]);
  
  // Categorize airports
  const { largeAirports, smallAirports } = useMemo(() => {
    const large: Airport[] = [];
    const small: Airport[] = [];
    
    airports.forEach(airport => {
      if (airport.type === 'large_airport') {
        large.push(airport);
      } else {
        small.push(airport);
      }
    });
    
    return { largeAirports: large, smallAirports: small };
  }, [airports]);
  
  return (
    <group>
      {/* Large airports - bigger squares, always visible */}
      <LargeAirportsInstanced airports={largeAirports} />
      
      {/* Small/medium airports - circles, only when very zoomed in */}
      <SmallAirportsInstanced airports={smallAirports} />
    </group>
  );
}
