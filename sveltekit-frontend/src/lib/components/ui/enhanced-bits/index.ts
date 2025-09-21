// Enhanced bits-ui components for legal AI platform
// SAFE COMPONENTS ONLY - broken components moved to enhanced-bits-disabled

// Core UI Components (verified safe)
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Dialog } from './Dialog.svelte';
export { default as Label } from '../Label.svelte';

// Card Components
export { default as Card } from './Card.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardFooter } from './CardFooter.svelte';

// AI-Specific Components (verified safe)
export { default as AIChatMessage } from './AIChatMessage.svelte';
export { default as AIRecommendations } from './AIRecommendations.svelte';
export { default as SearchInput } from './SearchInput.svelte';

// Gemma Embedding Components (new integrations)
export { default as EmbeddingForm } from './EmbeddingForm.svelte';
export { default as EmbeddingSearch } from './EmbeddingSearch.svelte';
export { default as GemmaEmbeddingDemo } from './GemmaEmbeddingDemo.svelte';

// Safe utility components
// export { default as GoldenRatioLoader } from './GoldenRatioLoader.svelte';
export { default as KeyboardMapping } from './KeyboardMapping.svelte';
export { default as LinkButton } from './LinkButton.svelte';

// WebGPU Components (may be safe but cautious)
// export { default as GlyphEngineRenderer } from './GlyphEngineRenderer.svelte';
// export { default as SPACanvasRenderer } from './SPACanvasRenderer.svelte';
// export { default as SSRWebGPULoader } from './SSRWebGPULoader.svelte';

// Demo components (keeping minimal)
// export { default as EnhancedBitsDemo } from './EnhancedBitsDemo.svelte';

// Tabs compound component export
export * as TabsBits from '../tabs-bits';

// Basic interfaces
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}