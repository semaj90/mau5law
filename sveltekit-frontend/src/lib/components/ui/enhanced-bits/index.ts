// Enhanced bits-ui components for legal AI platform
// Clean index with proper .svelte imports (no .js extensions)

// Core UI Components
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Dialog } from './Dialog.svelte';
export { default as Select } from './Select.svelte';
export { default as Alert } from './Alert.svelte';
export { default as AlertDescription } from './AlertDescription.svelte';
export { default as Label } from './Label.svelte';

// Card Components
export { default as Card } from './Card.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardFooter } from './CardFooter.svelte';

// AI-Specific Components
export { default as AIChatMessage } from './AIChatMessage.svelte';
export { default as AIDialog } from './AIDialog.svelte';
export { default as AIRecommendations } from './AIRecommendations.svelte';
export { default as AISearchBar } from './AISearchBar.svelte';
export { default as SearchInput } from './SearchInput.svelte';

// Legal AI Components
export { default as LegalAIDemo } from './LegalAIDemo.svelte';
export { default as EvidenceAIAnalysis } from './EvidenceAIAnalysis.svelte';
export { default as EvidenceThumbnail } from './EvidenceThumbnail.svelte';
export { default as EnhancedRAGStudio } from './EnhancedRAGStudio.svelte';
export { default as HybridLegalAnalysis3D } from './HybridLegalAnalysis3D.svelte';

// Specialized Components
export { default as DialogWrapper } from './DialogWrapper.svelte';
export { default as ChatMessage } from './ChatMessage.svelte';
export { default as EmbeddingGemmaChat } from './EmbeddingGemmaChat.svelte';
export { default as GoldenRatioLoader } from './GoldenRatioLoader.svelte';
export { default as IntelligentRenderer } from './IntelligentRenderer.svelte';
export { default as KeyboardHelp } from './KeyboardHelp.svelte';
export { default as KeyboardProvider } from './KeyboardProvider.svelte';
export { default as KeyboardMapping } from './KeyboardMapping.svelte';
export { default as LinkButton } from './LinkButton.svelte';
export { default as Board } from './Board.svelte';

// WebGPU & Rendering Components
export { default as GlyphEngineRenderer } from './GlyphEngineRenderer.svelte';
export { default as SPACanvasRenderer } from './SPACanvasRenderer.svelte';
export { default as SSRWebGPULoader } from './SSRWebGPULoader.svelte';

// Full Stack Components
export { default as FullStackLegalAI } from './FullStackLegalAI.svelte';
export { default as VectorIntelligenceDemo } from './VectorIntelligenceDemo.svelte';
export { default as AIAssistantTest } from './AIAssistantTest.svelte';

// Demo Components
export { default as EnhancedBitsDemo } from './EnhancedBitsDemo.svelte';
export { default as WebAssemblyIntegrationDemo } from './WebAssemblyIntegrationDemo.svelte';

// Tabs compound component export
export * as TabsBits from '../tabs-bits';

// TypeScript interfaces and types
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

// Professional theme utilities
export const LEGAL_AI_VARIANTS = {
  card: {
    elevated: 'shadow-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    flat: 'border border-slate-200 bg-white',
    outlined: 'border-2 border-amber-300 bg-transparent'
  },
  button: {
    primary: 'bg-amber-600 hover:bg-amber-700 text-white',
    secondary: 'bg-slate-600 hover:bg-slate-700 text-white',
    outline: 'border-2 border-amber-600 text-amber-600 hover:bg-amber-50'
  }
} as const;
