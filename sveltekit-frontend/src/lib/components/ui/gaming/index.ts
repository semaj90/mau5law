/**
 * Progressive Gaming UI Component Library
 * 8-bit (NES) → 16-bit (SNES) → N64-style 3D Components
 * 
 * Features:
 * - Authentic retro visual styling
 * - Progressive enhancement capabilities
 * - Integration with YoRHa 3D system
 * - bits-ui compatibility for SSR
 */

// 8-bit NES-style Components
export { default as NES8BitButton } from './8bit/NES8BitButton.svelte';
export { default as NES8BitContainer } from './8bit/NES8BitContainer.svelte';
export { default as NES8BitDialog } from './8bit/NES8BitDialog.svelte';
export { default as NES8BitProgress } from './8bit/NES8BitProgress.svelte';
export { default as NES8BitInput } from './8bit/NES8BitInput.svelte';
export { default as NES8BitBadge } from './8bit/NES8BitBadge.svelte';

// 16-bit SNES-style Enhanced Components
export { default as SNES16BitButton } from './16bit/SNES16BitButton.svelte';
export { default as SNES16BitContainer } from './16bit/SNES16BitContainer.svelte';
export { default as SNES16BitDialog } from './16bit/SNES16BitDialog.svelte';
export { default as SNES16BitProgress } from './16bit/SNES16BitProgress.svelte';
export { default as SNES16BitInput } from './16bit/SNES16BitInput.svelte';
export { default as SNES16BitCard } from './16bit/SNES16BitCard.svelte';

// N64-style 3D Components
export { default as N643DButton } from './n64/N643DButton.svelte';
export { default as N643DContainer } from './n64/N643DContainer.svelte';
export { default as N643DDialog } from './n64/N643DDialog.svelte';
export { default as N643DPanel } from './n64/N643DPanel.svelte';
export { default as N643DInput } from './n64/N643DInput.svelte';

// Progressive Enhancement Utilities
export { default as ProgressiveGamingProvider } from './core/ProgressiveGamingProvider.svelte';
export { useGamingEvolution } from './core/useGamingEvolution.js';

// Gaming Evolution Manager
export { GamingEvolutionManager } from './core/GamingEvolutionManager.js';

// Types and Interfaces
export type {
  GamingEra,
  NESColorPalette,
  SNESColorPalette,
  N64RenderingOptions,
  ProgressiveGamingConfig,
  GamingComponentProps
} from './types/gaming-types.js';

// Color Palettes and Constants
export {
  NES_COLOR_PALETTE,
  SNES_COLOR_PALETTE,
  N64_TEXTURE_PRESETS,
  GAMING_BREAKPOINTS
} from './constants/gaming-constants.js';