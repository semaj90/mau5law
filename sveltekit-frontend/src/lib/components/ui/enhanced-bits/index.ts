
// Enhanced Bits UI v2 + Svelte 5 + UnoCSS Integration
// Optimized for Legal AI with NieR theming + SSR-friendly compound components

import ButtonComponent from "./Button.svelte";
import DialogComponent from "./Dialog.svelte";
import SelectComponent from "./Select.svelte";
import InputComponent from "./Input.svelte";
import LabelComponent from "./Label.svelte";
import AlertComponent from "./Alert.svelte";
import AlertDescriptionComponent from "./AlertDescription.svelte";
import CardComponent from "./Card.svelte";
import CardHeaderComponent from "./CardHeader.svelte";
import CardTitleComponent from "./CardTitle.svelte";
import CardDescriptionComponent from "./CardDescription.svelte";
import CardContentComponent from "./CardContent.svelte";
import CardFooterComponent from "./CardFooter.svelte";

// Standard exports for direct usage
export { default as Button } from "./Button.svelte";
export { default as Input } from "./Input.svelte";
export { default as Label } from "./Label.svelte";
export { default as Alert } from "./Alert.svelte";
export { default as AlertDescription } from "./AlertDescription.svelte";
export { default as CardHeader } from "./CardHeader.svelte";
export { default as CardTitle } from "./CardTitle.svelte";
export { default as CardDescription } from "./CardDescription.svelte";
export { default as CardContent } from "./CardContent.svelte";
export { default as CardFooter } from "./CardFooter.svelte";

// Specialized Legal AI Components
export { default as EvidenceThumbnail } from "./EvidenceThumbnail.svelte";
export { default as EvidenceAIAnalysis } from "./EvidenceAIAnalysis.svelte";
export { default as SearchInput } from "./SearchInput.svelte";
export { default as Board } from "./Board.svelte";

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
export { default as Card } from './Card.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardFooter } from './CardFooter.svelte';

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
export { default as EnhancedBitsDemo } from "./EnhancedBitsDemo.svelte";
export { default as VectorIntelligenceDemo } from "./VectorIntelligenceDemo.svelte";
export { default as LegalAIDemo } from "./LegalAIDemo.svelte";

// Keyboard Management components
export { default as KeyboardMapping } from "./KeyboardMapping.svelte";
export { default as KeyboardHelp } from "./KeyboardHelp.svelte";

// Types and utilities
export type * from "./types";
export * from "../enhanced/button-variants";
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
