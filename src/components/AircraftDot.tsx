'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAirspaceStore } from '@/store/gameStore';

interface Aircraft {
  id: string;
  callsign: string;
  position: { latitude: number; longitude: number; altitude: number; heading: number; speed: number; };
  isPlayerControlled?: boolean;
}

function latLonToVector3(lat: number, lon: number, alt: number = 0): THREE.Vector3 {
  const r = 1 + alt * 0.0000005;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function getAircraftOrientation(lat: number, lon: number, heading: number): THREE.Quaternion {
  const position = latLonToVector3(lat, lon, 0);
  
  // Up is radial direction (away from globe center)
  const up = position.clone().normalize();
  
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);
  
  // North vector (direction of increasing latitude along the surface)
  const north = new THREE.Vector3(
    Math.sin(latRad) * Math.cos(lonRad + Math.PI),
    Math.cos(latRad),
    -Math.sin(latRad) * Math.sin(lonRad + Math.PI)
  ).normalize();
  
  // Make north perpendicular to up (project onto tangent plane)
  north.sub(up.clone().multiplyScalar(north.dot(up))).normalize();
  
  // East vector (perpendicular to both up and north)
  const east = new THREE.Vector3().crossVectors(up, north).normalize();
  
  // Recalculate north to ensure orthogonality
  north.crossVectors(east, up).normalize();
  
  // Heading: 0 = north, 90 = east, 180 = south, 270 = west
  const headingRad = heading * (Math.PI / 180);
  
  // Forward direction based on heading
  const forward = new THREE.Vector3()
    .addScaledVector(north, Math.cos(headingRad))
    .addScaledVector(east, Math.sin(headingRad))
    .normalize();
  
  // Create rotation matrix: forward = +Y, up = +Z (wings at +Z = away from globe)
  const matrix = new THREE.Matrix4();
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();
  
  matrix.makeBasis(right, forward, up);
  
  const quaternion = new THREE.Quaternion();
  quaternion.setFromRotationMatrix(matrix);
  
  return quaternion;
}

export function AircraftDot({ aircraft, onClick }: { aircraft: Aircraft; onClick?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedAircraft = useAirspaceStore((state) => state.gameState.selectedAircraft);
  const hoveredAircraft = useAirspaceStore((state) => state.gameState.hoveredAircraft);
  const hoverAircraft = useAirspaceStore((state) => state.hoverAircraft);
  const isSelected = selectedAircraft === aircraft.id;
  const isHovered = hoveredAircraft === aircraft.id;
  
  const currentPos = useRef(latLonToVector3(aircraft.position.latitude, aircraft.position.longitude, aircraft.position.altitude));
  const targetPos = useRef(currentPos.current.clone());
  const currentQuat = useRef(getAircraftOrientation(aircraft.position.latitude, aircraft.position.longitude, aircraft.position.heading));
  const targetQuat = useRef(currentQuat.current.clone());
  
  // 3D Paper airplane geometry
  const planeGeometry = useMemo(() => {
    const s = 0.008;
    const geometry = new THREE.BufferGeometry();
    
    // Paper airplane: nose at +Y, wings at +Z (away from globe), keel at -Z (into globe)
    const vertices = new Float32Array([
      // Left wing (top surface) - wings point UP/outward (+Z)
      0, s * 1.5, 0,
      0, -s * 0.3, 0,
      -s * 0.7, -s * 0.5, s * 0.25,
      
      // Right wing (top surface) - wings point UP/outward (+Z)
      0, s * 1.5, 0,
      s * 0.7, -s * 0.5, s * 0.25,
      0, -s * 0.3, 0,
      
      // Left wing (bottom surface)
      0, s * 1.5, 0,
      -s * 0.7, -s * 0.5, s * 0.25,
      0, -s * 0.3, 0,
      
      // Right wing (bottom surface)
      0, s * 1.5, 0,
      0, -s * 0.3, 0,
      s * 0.7, -s * 0.5, s * 0.25,
      
      // Body keel (left face) - keel points DOWN/into globe (-Z)
      0, s * 1.5, 0,
      0, -s * 0.3, 0,
      0, -s * 0.6, -s * 0.15,
      
      // Body keel (right face)
      0, s * 1.5, 0,
      0, -s * 0.6, -s * 0.15,
      0, -s * 0.3, 0,
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return geometry;
  }, []);
  
  // Larger hitbox for easier clicking
  const hitboxGeometry = useMemo(() => {
    const s = 0.02;
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, s * 1.5, 0,
      -s * 0.8, -s * 0.8, s * 0.4,
      s * 0.8, -s * 0.8, s * 0.4,
      
      0, s * 1.5, 0,
      s * 0.8, -s * 0.8, s * 0.4,
      0, -s * 0.8, -s * 0.3,
      
      0, s * 1.5, 0,
      0, -s * 0.8, -s * 0.3,
      -s * 0.8, -s * 0.8, s * 0.4,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }, []);
  
  useEffect(() => {
    targetPos.current = latLonToVector3(aircraft.position.latitude, aircraft.position.longitude, aircraft.position.altitude);
    targetQuat.current = getAircraftOrientation(aircraft.position.latitude, aircraft.position.longitude, aircraft.position.heading);
  }, [aircraft.position.latitude, aircraft.position.longitude, aircraft.position.altitude, aircraft.position.heading]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Lerp position
    currentPos.current.lerp(targetPos.current, Math.min(delta * 2, 1));
    groupRef.current.position.copy(currentPos.current);
    
    // Slerp rotation
    currentQuat.current.slerp(targetQuat.current, Math.min(delta * 2, 1));
    groupRef.current.quaternion.copy(currentQuat.current);
    
    // Scale on hover/select
    const baseScale = isSelected ? 1.5 : isHovered ? 1.3 : 1;
    const pulse = (isSelected || isHovered) ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1 : 1;
    groupRef.current.scale.setScalar(baseScale * pulse);
  });
  
  const getColor = () => {
    if (aircraft.isPlayerControlled) return '#00ff88';
    if (isSelected) return '#00aaff';
    if (isHovered) return '#ffaa00';
    return '#ffffff';
  };
  
  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); hoverAircraft(aircraft.id); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { hoverAircraft(null); document.body.style.cursor = 'auto'; }}
    >
      {/* Invisible larger hitbox for easier clicking */}
      <mesh geometry={hitboxGeometry}>
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Visible 3D paper airplane */}
      <mesh geometry={planeGeometry}>
        <meshBasicMaterial color={getColor()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
