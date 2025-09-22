// Legal AI Platform UI System - Svelte 5 + bits-ui + UnoCSS
// Following COMPONENT_ARCHITECTURE_ANALYSIS2.md modernization plan

// === CORE UI COMPONENTS (Svelte 5 Migrated) ===
export { default as AIDialog } from './AIDialog.svelte';
export { default as ChatMessage } from './ChatMessage.svelte';
export { default as DialogWrapper } from './DialogWrapper.svelte';
export { default as Select } from './Select.svelte';

// === ENHANCED BITS (Advanced Legal AI Behaviors) ===
export * from './enhanced-bits/index.js';

// === BITS-UI RE-EXPORTS (Consolidated UI System) ===
export * from 'bits-ui';
