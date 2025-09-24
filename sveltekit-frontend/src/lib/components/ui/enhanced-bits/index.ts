// Enhanced-Bits Component System - Gaming-Inspired Legal AI Platform
// These components extend bits-ui with specialized legal, evidence, and AI features

// Core UI Components (Svelte 5 migrated)
export { default as AIDialog } from '../AIDialog.svelte';
export { default as ChatMessage } from '../ChatMessage.svelte';
export { default as DialogWrapper } from '../DialogWrapper.svelte';
export { default as Select } from '../Select.svelte';
export { default as Button } from '../button/Button.svelte';

// Card Components
export { default as Card } from './Card.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardFooter } from './CardFooter.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';

// Input Components
export { default as Input } from './Input.svelte';
export { default as Label } from './Label.svelte';

// Navigation Components
export { default as LinkButton } from './LinkButton.svelte';
export { default as YoRHaSearchBar } from './YoRHaSearchBar.svelte';
export { default as ThemeToggle } from './ThemeToggle.svelte';

// Gaming Components (Implemented)
export { default as N64Button } from '../gaming/N64Button.svelte';
export { default as NESContainer } from '../gaming/NESContainer.svelte';
export { default as PixelCard } from '../gaming/PixelCard.svelte';

// Complex AI Components (Enhanced behaviors - require migration)
export { default as EmbeddingGemmaChat } from './EmbeddingGemmaChat.svelte';
export { default as Board } from './Board.svelte';
export { default as EnhancedRAGStudio } from './EnhancedRAGStudio.svelte';

// Demo Components
export { default as PerformanceOptimizedEvidenceBoard } from '../demo/PerformanceOptimizedEvidenceBoard.svelte';

// Gaming Theme System (Implemented)
export * from '../../themes/retro-console-palettes';
export {
  CONSOLE_PALETTES,
  applyConsolePalette,
  getCurrentPalette,
  getPalette,
  getPaletteNames,
  createThemeCSS
} from '../../themes/retro-console-palettes';

// Enhanced-Bits Design System (Implemented)
export {
  BASE_DESIGN_TOKENS,
  THEME_PRESETS,
  createCustomTheme,
  applyDesignSystemToDocument,
  getCurrentTheme,
  generateUtilityCSS,
  initializeDesignSystem
} from '../../themes/design-system';

// Component Loader for Dynamic Imports
export async function loadComponent(name: string) {
  try {
    const module = await import(`../components/${name}.svelte`);
    return module.default;
  } catch (error) {
    console.warn(`Component ${name} not found`);
    return null;
  }
}

// Gaming Component Loader
export async function loadGamingComponent(name: 'N64Button' | 'NESContainer' | 'PixelCard') {
  try {
    const module = await import(`../gaming/${name}.svelte`);
    return module.default;
  } catch (error) {
    console.warn(`Gaming component ${name} not found`);
    return null;
  }
}

// Re-export bits-ui for consistency
export * from 'bits-ui';

// Compound component patterns
export * as Card from '../card';
export * as Dialog from '../dialog';

// Theme utilities
export function applyRetroTheme(themeName: keyof typeof CONSOLE_PALETTES = 'legal') {
  if (typeof document !== 'undefined') {
    applyConsolePalette(themeName);
    return true;
  }
  return false;
}

// Enhanced-Bits initialization
export function initializeEnhancedBits(options?: {
  theme?: keyof typeof CONSOLE_PALETTES;
  designSystem?: keyof typeof THEME_PRESETS;
}) {
  if (typeof document === 'undefined') return;

  // Apply theme
  if (options?.theme) {
    applyConsolePalette(options.theme);
  }

  // Initialize design system
  if (options?.designSystem) {
    initializeDesignSystem(options.designSystem);
  }

  console.log('🎮 Enhanced-Bits initialized with gaming theme system');
}
