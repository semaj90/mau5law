// Enhanced Bits UI Components with Legal AI behaviors
// These components extend bits-ui with specialized legal, evidence, and AI features

// Core UI Components (Svelte 5 migrated)
export { default as AIDialog } from '../AIDialog.svelte';
export { default as ChatMessage } from '../ChatMessage.svelte';
export { default as DialogWrapper } from '../DialogWrapper.svelte';
export { default as Select } from '../Select.svelte';

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

// Complex AI Components (Enhanced behaviors - require migration)
export { default as EmbeddingGemmaChat } from './EmbeddingGemmaChat.svelte';
export { default as Board } from './Board.svelte';
export { default as EnhancedRAGStudio } from './EnhancedRAGStudio.svelte';

// Re-export bits-ui for consistency
export * from 'bits-ui';
