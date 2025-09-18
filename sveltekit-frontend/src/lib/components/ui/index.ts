// UI Component Barrel Exports - Svelte 5 Compatible
// Comprehensive exports for legal AI platform with enhanced-bits integration

// === Enhanced Bits-UI Components (Primary) ===
// These are the modern, Svelte 5 compatible components with legal AI theming
export * from './enhanced-bits';

// === Layout Components ===
export { default as Sidebar } from '../layout/Sidebar.svelte';
export { default as Footer } from '../layout/Footer.svelte';
export { default as NavBar } from '../layout/NavBar.svelte';
export { default as UnifiedLayout } from '../layout/UnifiedLayout.svelte';
export { default as EnhancedLayout } from '../layout/EnhancedLayout.svelte';

// === Legacy Core UI Components (Fallback) ===
export { default as Badge } from './Badge.svelte';
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardFooter } from './CardFooter.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';
export { default as Checkbox } from './Checkbox.svelte';
export { default as Input } from './Input.svelte';
export { default as Label } from './Label.svelte';
export { default as Modal } from './Modal.svelte';
export { default as Textarea } from './Textarea.svelte';

// === AI & Legal Components ===
export { default as AdvancedRichTextEditor } from './AdvancedRichTextEditor.svelte';
export { default as AIDropdown } from './AIDropdown.svelte';
export { default as CaseForm } from './CaseForm.svelte';
export { default as CaseItem } from './CaseItem.svelte';
export { default as CommandMenu } from './CommandMenu.svelte';
export { default as CommandPalette } from './CommandPalette.svelte';
export { default as AIAccessibilityWrapper } from './AIAccessibilityWrapper.svelte';
export { default as DataGrid } from './DataGrid.svelte';
export { default as DragDropZone } from './DragDropZone.svelte';
export { default as GoldenLayout } from './GoldenLayout.svelte';

// === Modular Components ===
export { default as ModularDialog } from './modular-dialog/ModularDialog.svelte';

// === Tooltip System ===
export * from './tooltip';

// === Button Variants ===
export { default as BitsButton } from './bitsbutton.svelte';

// === Type Exports ===
export type ComponentLibrary = 'enhanced-bits' | 'bits-ui' | 'legacy';
export type LayoutVariant = 'full' | 'minimal' | 'demo' | 'admin' | 'evidence';
export type LegalAITheme = 'yorha' | 'nier' | 'gaming' | 'professional';
}

export interface ComponentChoice {
  library: ComponentLibrary;
  reason?: string;
}

export interface LayoutConfig {
  variant: LayoutVariant;
  theme: LegalAITheme;
  showSidebar?: boolean;
  showFooter?: boolean;
  title?: string;
}

// Enhanced-bits component re-exports for easier access
export type { SelectOption } from './enhanced-bits';
export { LEGAL_AI_VARIANTS } from './enhanced-bits';

// === Utility Functions ===;
export function selectComponentLibrary(choice: ComponentLibrary = 'enhanced-bits'): ComponentChoice {
  return {
    library: choice,
    reason: choice === 'enhanced-bits'
      ? 'Using enhanced-bits UI system with Svelte 5 and legal AI theming'
      : `Using ${choice} component library`
  };
}

export function createLayoutConfig(variant: LayoutVariant, theme: LegalAITheme = 'yorha'): LayoutConfig {
  return {
    variant,
    theme,
    showSidebar: variant !== 'minimal',
    showFooter: true,
    title: variant === 'demo' ? 'Demo Environment' : undefined,
  };
}

export const preloadComponent = async (loader: () => Promise<any>) => {
  try {
    return await loader();
  } catch (error: any) {
    console.warn('Failed to preload component:', error);
    return null;
  }
};

// === Barrel Exports from Subdirectories ===
// Only export from directories that exist and have index files
export * from './command';
export * from './dialog';