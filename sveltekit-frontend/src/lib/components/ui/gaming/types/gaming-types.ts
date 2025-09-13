/**
 * Gaming UI Component Types
 * Type definitions for N64, NES, and retro gaming components
 */

export interface GamingComponentProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  class?: string;
  style?: string;
  [key: string]: any;
}

export interface N64RenderingOptions {
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  enableBilinearFiltering: boolean;
  enableTrilinearFiltering: boolean;
  anisotropicLevel: 1 | 2 | 4 | 8 | 16;
  meshComplexity: 'low' | 'medium' | 'high' | 'ultra';
  materialType: 'basic' | 'phong' | 'pbr';
  enableShadows: boolean;
  enableReflections: boolean;
  shadowMapSize: 256 | 512 | 1024 | 2048;
}

export type GamingEra = 'nes' | 'snes' | 'n64' | 'ps1' | 'dreamcast' | 'modern' | '8bit' | '16bit';

export interface NESColorPalette {
  background: string[];
  sprites: string[];
  ui: string[];
  // Individual color properties for direct access
  black?: string;
  white?: string;
  darkGray?: string;
  lightGray?: string;
  red?: string;
  blue?: string;
  green?: string;
  yellow?: string;
}

export interface SNESColorPalette {
  background: string[];
  sprites: string[];
  ui: string[];
  effects: string[];
  // Individual color properties for direct access
  black?: string;
  white?: string;
  darkGray?: string;
  lightGray?: string;
  red?: string;
  blue?: string;
  green?: string;
  yellow?: string;
  // SNES-specific additional colors
  purple?: string;
  orange?: string;
  cyan?: string;
  magenta?: string;
  pink?: string;
  lime?: string;
  // Gradient support
  primaryGradient?: string[];
  secondaryGradient?: string[];
}

export interface N64ButtonConfig {
  texture: 'plastic' | 'rubber' | 'metal';
  shape: 'round' | 'square' | 'dpad' | 'analog';
  color: string;
  pressDepth: number;
  springTension: number;
}

export interface GamepadState {
  connected: boolean;
  id: string;
  buttons: boolean[];
  axes: number[];
  timestamp: number;
}

export interface GamingThemeState {
  era: GamingEra;
  currentEra?: GamingEra;
  colorPalette: NESColorPalette | SNESColorPalette;
  soundEnabled: boolean;
  particleEffects: boolean;
  retroShaders: boolean;
  performanceLevel?: 'low' | 'medium' | 'high';
  availableEras?: GamingEra[];
  isTransitioning?: boolean;
  transitionDuration?: number;
}

export interface RetroEffect {
  name: string;
  type: 'visual' | 'audio' | 'haptic';
  intensity: number;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

export interface GamingAudioConfig {
  enableSpatialAudio: boolean;
  masterVolume: number;
  soundEffectVolume: number;
  musicVolume: number;
  audioContext?: AudioContext;
  reverbLevel: number;
}

export interface ProgressiveGamingConfig {
  autoDetectPerformance: boolean;
  fallbackToLowQuality: boolean;
  adaptiveFrameRate: boolean;
  thermalThrottling: boolean;
  batteryOptimization: boolean;
  enableAutoEvolution?: boolean;
  defaultEra?: GamingEra;
  performanceThreshold?: number;
}
