'use client';

import { useEffect, useCallback } from 'react';
import { inputManager, InputAction, InputState } from '@/lib/inputManager';

// Initialize the input manager on first use
let initialized = false;

export function useInputManagerInit() {
  useEffect(() => {
    if (!initialized) {
      inputManager.init();
      initialized = true;
    }
    
    return () => {
      // Don't destroy on unmount - we want it to persist
    };
  }, []);
}

// Hook for canvas components (3D scene)
export function useCanvasInput(callback: (action: InputAction) => void) {
  useEffect(() => {
    return inputManager.subscribeCanvas(callback);
  }, [callback]);
  
  const getState = useCallback((): InputState => {
    return inputManager.getState();
  }, []);
  
  return { getState };
}

// Hook for UI components
export function useUIInput(callback: (action: InputAction) => void) {
  useEffect(() => {
    return inputManager.subscribeUI(callback);
  }, [callback]);
}

// Hook for global actions
export function useGlobalInput(callback: (action: InputAction) => void) {
  useEffect(() => {
    return inputManager.subscribeGlobal(callback);
  }, [callback]);
}

// Hook to just get input state (for polling in useFrame)
export function useInputState() {
  return useCallback((): InputState => {
    return inputManager.getState();
  }, []);
}

