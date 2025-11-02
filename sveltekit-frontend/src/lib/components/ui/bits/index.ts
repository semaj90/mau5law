// Enhanced-Bits Component Library
// Modern SvelteKit 2 + Svelte 5 UI Components for Legal AI Platform
// Core UI Components (from enhanced-bits directory)
export { default as ProfileContainer } from './ProfileContainer.svelte';
export { default as ProfileHeader } from './ProfileHeader.svelte';
export { default as StatCard } from './StatCard.svelte';
export { default as Alert } from './Alert.svelte';
export { default as FormGrid } from './FormGrid.svelte';
export { default as AvatarDisplay } from './AvatarDisplay.svelte';
export { default as EditorCard } from './EditorCard.svelte';
// Re-export commonly used components from parent UI directory
export { default as Button } from '../button/Button.svelte';
export { default as Card } from '../card/Card.svelte';
export { default as CardContent } from '../card/CardContent.svelte';
export { default as CardHeader } from '../card/CardHeader.svelte';
export { default as CardTitle } from '../card/CardTitle.svelte';
export { default as CardDescription } from '../card/CardDescription.svelte';
export { default as CardFooter } from '../card/CardFooter.svelte';
// Form Components
export { default as Input } from '../input/Input.svelte';
export { default as Label } from '../label/Label.svelte';
export { default as Textarea } from '../Textarea.svelte';
// Dialog Components
export { default as Dialog } from '../dialog/Dialog.svelte';
// Theme utilities
export * from '$lib/themes/retro-console-palettes';
export * from '$lib/cache/multi-layer-cache';
// Component registry for dynamic loading
export const ENHANCED_BITS_COMPONENTS = {
  ProfileContainer: () => import('./ProfileContainer.svelte'),
  ProfileHeader: () => import('./ProfileHeader.svelte'),
  StatCard: () => import('./StatCard.svelte'),
  Alert: () => import('./Alert.svelte'),
  FormGrid: () => import('./FormGrid.svelte'),
  AvatarDisplay: () => import('./AvatarDisplay.svelte'),
  EditorCard: () => import('./EditorCard.svelte')
};
// Dynamic component loader
export async function loadComponent(name: keyof typeof ENHANCED_BITS_COMPONENTS): Promise<any> {
  try {
    const module = await ENHANCED_BITS_COMPONENTS[name]();
    return module.default;
  } catch (error) {
    console.warn(`Failed to load enhanced-bits component: ${name}`, error);
    return null;
  }
}
// Theme utilities
export const ENHANCED_BITS_THEMES = { legal: {, primary: '#1e40af',
    secondary: '#7c3aed',
    surface: '#ffffff',
    text: '#111827',
    border: '#e5e7eb'
  },
  gaming: {
    primary: '#00ff41',
    secondary: '#ff0041',
    surface: '#2a2a2a',
    text: '#e0e0e0',
    border: '#444444` }
};
export type EnhancedBitsTheme = keyof typeof ENHANCED_BITS_THEMES;
// YoRHa Harvard Gaming Components
export { default as YoRHaHarvardButton } from './YoRHaHarvardButton.svelte';
export { default as YoRHaHarvardCard } from './YoRHaHarvardCard.svelte';
// Enhanced Modal Component
export { default as EnhancedModal } from './EnhancedModal.svelte';
