// Legal AI Platform UI System - Svelte 5 + bits-ui + UnoCSS
// Following COMPONENT_ARCHITECTURE_ANALYSIS2.md modernization plan
// === CORE UI COMPONENTS (Svelte 5 Migrated) ===
export { default as AIDialog } from './AIDialog.svelte';
export { default as ChatMessage } from './ChatMessage.svelte';
export { default as DialogWrapper } from './DialogWrapper.svelte';
export { default as Select } from './Select.svelte';
// === ENHANCED LEGAL AI COMPONENTS ===
export { default as Button } from './button/Button.svelte';
export { default as ButtonBits } from './button/ButtonBits.svelte';
export { default as LegalButton } from './button/ButtonBits.svelte'; // Alias for consistency
export { default as CardBits } from './Card/CardBits.svelte';
export { default as LegalCard } from './Card/CardBits.svelte'; // Alias for consistency
export { default as DialogBits } from './dialog/DialogBits.svelte';
export { default as LegalDialog } from './dialog/DialogBits.svelte'; // Alias for consistency
// === ENHANCED BITS (Advanced Legal AI Behaviors) ===
export * from './enhanced-bits/index.js';
// === BITS-UI RE-EXPORTS (Consolidated UI System) ===
export * from 'bits-ui';
// === COMPONENT COLLECTIONS ===
import ButtonBitsComponent from './button/ButtonBits.svelte';
import CardBitsComponent from './Card/CardBits.svelte';
import DialogBitsComponent from './dialog/DialogBits.svelte';
export const LegalComponents = {
  Button: ButtonBitsComponent
  Card: CardBitsComponent
  Dialog: DialogBitsComponent
}
// === UTILITY FUNCTIONS ===
export { cn } from '$lib/utils';