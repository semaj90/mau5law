
// Enhanced Bits UI v2 + Svelte 5 + UnoCSS Integration
// Optimized for Legal AI with NieR theming + SSR-friendly compound components

import ButtonComponent from './Button.svelte.js';
import DialogComponent from './Dialog.svelte.js';
import SelectComponent from './Select.svelte.js';
import InputComponent from './Input.svelte.js';
import LabelComponent from './Label.svelte.js';
import AlertComponent from './Alert.svelte.js';
import AlertDescriptionComponent from './AlertDescription.svelte.js';
import CardComponent from './Card.svelte.js';
import CardHeaderComponent from './CardHeader.svelte.js';
import CardTitleComponent from './CardTitle.svelte.js';
import CardDescriptionComponent from './CardDescription.svelte.js';
import CardContentComponent from './CardContent.svelte.js';
import CardFooterComponent from './CardFooter.svelte.js';

// Standard exports for direct usage
export { default as Button } from './Button.svelte.js';
export { default as LinkButton } from './LinkButton.svelte.js';
export { default as Input } from './Input.svelte.js';
export { default as Label } from './Label.svelte.js';
export { default as Alert } from './Alert.svelte.js';
export { default as AlertDescription } from './AlertDescription.svelte.js';
export { default as CardHeader } from './CardHeader.svelte.js';
export { default as CardTitle } from './CardTitle.svelte.js';
export { default as CardDescription } from './CardDescription.svelte.js';
export { default as CardContent } from './CardContent.svelte.js';
export { default as CardFooter } from './CardFooter.svelte.js';

// Specialized Legal AI Components
export { default as EvidenceThumbnail } from './EvidenceThumbnail.svelte.js';
export { default as EvidenceAIAnalysis } from './EvidenceAIAnalysis.svelte.js';
export { default as SearchInput } from './SearchInput.svelte.js';
export { default as Board } from './Board.svelte.js';

// AI Assistant Components
export { default as AIChatMessage } from './AIChatMessage.svelte.js';
export { default as AIDialog } from './AIDialog.svelte.js';
export { default as AISearchBar } from './AISearchBar.svelte.js';
export { default as AIRecommendations } from './AIRecommendations.svelte.js';
export { default as ChatMessage } from './ChatMessage.svelte.js';
export { default as AIAssistantTest } from './AIAssistantTest.svelte.js';

// =============================================================================
// ENHANCED-BITS DUAL IMPORT APPROACH FOR SSR COMPATIBILITY
// =============================================================================
//
// Problem: Vite's SSR import wrapper system (__vite_ssr_import_X__) doesn't work
// well with Object.assign compound components, causing runtime errors.
//
// Solution: Provide both direct imports and compound components:
//
// ✅ DIRECT IMPORTS (SSR-Safe, Recommended for SSR environments):
//   import Card from '$lib/components/ui/enhanced-bits/Card.svelte';
//
// ✅ NAMED IMPORTS (SSR-Safe, Clean syntax):
//   import { Card, CardHeader } from '$lib/components/ui/enhanced-bits';
//
// ⚠️ COMPOUND IMPORTS (Use with caution in SSR):
//   import { CardCompound } from '$lib/components/ui/enhanced-bits';
//   <CardCompound.Root> // May not work in all SSR scenarios
//
// =============================================================================

// Direct component exports for enhanced-bits (SSR-compatible)
export { default as Card } from './Card.svelte.js';
export { default as CardHeader } from './CardHeader.svelte.js';
export { default as CardTitle } from './CardTitle.svelte.js';
export { default as CardDescription } from './CardDescription.svelte.js';
export { default as CardContent } from './CardContent.svelte.js';
export { default as CardFooter } from './CardFooter.svelte.js';

// Compound component exports for non-SSR or CSR-only scenarios
export const CardCompound = {
  Root: CardComponent,
  Header: CardHeaderComponent,
  Title: CardTitleComponent,
  Description: CardDescriptionComponent,
  Content: CardContentComponent,
  Footer: CardFooterComponent,
} as const;

export const DialogCompound = {
  Root: DialogComponent,
  Content: DialogComponent,
  Trigger: ButtonComponent,
  Title: CardTitleComponent,
  Description: CardDescriptionComponent,
} as const;

export const SelectCompound = {
  Root: SelectComponent,
  Content: SelectComponent,
  Item: SelectComponent,
  Trigger: ButtonComponent,
  Group: SelectComponent,
  Value: SelectComponent,
} as const;

// Demo components
export { default as EnhancedBitsDemo } from './EnhancedBitsDemo.svelte.js';
export { default as VectorIntelligenceDemo } from './VectorIntelligenceDemo.svelte.js';
export { default as LegalAIDemo } from './LegalAIDemo.svelte.js';

// Keyboard Management components
export { default as KeyboardMapping } from './KeyboardMapping.svelte.js';
export { default as KeyboardHelp } from './KeyboardHelp.svelte.js';

// Types and utilities
export type * from './types.js';
export * from '../enhanced/button-variants.js';
export { cn, legalCn, confidenceClass, priorityClass } from "$lib/utils/cn";

// Legal domain constants
export const EVIDENCE_TYPES = [
  "document",
  "image",
  "video",
  "audio",
  "transcript",
] as const;

export const PRIORITY_LEVELS = ["critical", "high", "medium", "low"] as const;

export const CASE_TYPES = [
  "criminal",
  "civil",
  "corporate",
  "employment",
  "intellectual_property",
] as const;
