// UI Component Barrel Exports - Svelte 5 Compatible
// Auto-generated exports for all existing UI components

// === Core UI Components ===
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

// === Enhanced UI Components ===
export { default as AdvancedRichTextEditor } from './AdvancedRichTextEditor.svelte';
export { default as AIDropdown } from './AIDropdown.svelte';
export { default as CaseForm } from './CaseForm.svelte';
export { default as CaseItem } from './CaseItem.svelte';
export { default as CommandMenu } from './CommandMenu.svelte';
export { default as CommandPalette } from './CommandPalette.svelte';

// === Modular Components ===
export { default as ModularDialog } from './modular-dialog/ModularDialog.svelte';

// === Tooltip System ===
export * from './tooltip';

// === Button Variants ===
export { default as BitsButton } from './bitsbutton.svelte';

// === Type Exports ===
export type ComponentLibrary = 'bits-ui';
export interface ComponentChoice {
  library: ComponentLibrary;
  reason?: string;
}

// === Utility Functions ===
export function selectComponentLibrary(choice: ComponentLibrary = 'bits-ui'): ComponentChoice {
  return { library: choice, reason: 'Using bits-ui consolidated UI system' };
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