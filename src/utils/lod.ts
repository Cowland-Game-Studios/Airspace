import * as THREE from 'three';

// ============================================================================
// SHARED LOD (Level of Detail) UTILITIES
// For lazy loading and visibility culling of rendered objects
// ============================================================================

/**
 * Calculate visibility factor based on angle from camera view direction
 * Uses dramatic cubic falloff for sharp edge fade
 * 
 * @param pos - World position of the object
 * @param camera - Three.js camera
 * @returns 0-1 visibility factor (0 = invisible, 1 = fully visible)
 */
export function calculateViewVisibility(pos: THREE.Vector3, camera: THREE.Camera): number {
  const cameraPos = camera.position.clone();
  const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  
  // Vector from camera to object
  const toObject = pos.clone().sub(cameraPos).normalize();
  
  // Dot product gives cosine of angle (1 = directly ahead, -1 = behind)
  const dot = cameraDir.dot(toObject);
  
  // Check if object is on visible side of globe (facing camera)
  const objectNormal = pos.clone().normalize();
  const cameraToGlobeCenter = cameraPos.clone().normalize().negate();
  const facingCamera = objectNormal.dot(cameraToGlobeCenter) < 0.2; // On visible hemisphere
  
  if (!facingCamera) return 0;
  
  // Dramatic visibility falloff - cubic easing for sharper edge fade
  // dot > 0.6 = fully visible, dot < 0.1 = invisible
  const rawVisibility = Math.max(0, Math.min(1, (dot - 0.1) / 0.5));
  // Apply cubic easing for dramatic falloff near edges
  return rawVisibility * rawVisibility * rawVisibility;
}

/**
 * LOD state for smooth opacity transitions
 */
export interface LODState {
  currentOpacity: number;
  targetOpacity: number;
  hasAppeared: boolean;
}

/**
 * Create initial LOD state
 */
export function createLODState(): LODState {
  return {
    currentOpacity: 0,
    targetOpacity: 1,
    hasAppeared: false,
  };
}

/**
 * Update LOD state with smooth opacity transition
 * 
 * @param state - Current LOD state (will be mutated)
 * @param viewVisibility - Current view visibility (0-1)
 * @param delta - Frame delta time
 * @param isHighlighted - Whether object is selected/hovered (bypasses culling)
 * @returns Object with visibility info and whether to render
 */
export function updateLODState(
  state: LODState,
  viewVisibility: number,
  delta: number,
  isHighlighted: boolean = false
): { opacity: number; scale: number; shouldRender: boolean } {
  // Highlighted objects always fully visible
  const effectiveVisibility = isHighlighted ? 1 : viewVisibility;
  
  // Mark as appeared on first update
  if (!state.hasAppeared) {
    state.hasAppeared = true;
    state.currentOpacity = 0;
  }
  
  // Set target opacity
  state.targetOpacity = effectiveVisibility;
  
  // Smooth opacity transition
  const smoothFactor = Math.min(delta * 4, 0.25);
  state.currentOpacity += (state.targetOpacity - state.currentOpacity) * smoothFactor;
  
  // Clamp to valid range
  state.currentOpacity = Math.max(0, Math.min(1, state.currentOpacity));
  
  // Determine if we should render at all
  const shouldRender = state.currentOpacity > 0.01;
  
  return {
    opacity: state.currentOpacity,
    scale: state.currentOpacity, // Scale matches opacity for consistent falloff
    shouldRender,
  };
}

/**
 * Calculate combined LOD visibility for instanced meshes
 * Returns per-instance scale values
 * 
 * @param positions - Array of world positions
 * @param camera - Three.js camera
 * @param baseScales - Optional base scale for each instance (defaults to 1)
 * @returns Array of final scale values for each instance
 */
export function calculateInstancedLOD(
  positions: THREE.Vector3[],
  camera: THREE.Camera,
  baseScales?: number[]
): number[] {
  return positions.map((pos, i) => {
    const visibility = calculateViewVisibility(pos, camera);
    const baseScale = baseScales ? baseScales[i] : 1;
    return baseScale * visibility;
  });
}

