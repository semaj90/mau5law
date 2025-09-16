// Enhanced bits-ui components for legal AI platform
// Clean index with proper .svelte imports (no .js extensions)

// Tabs compound component export
export * as TabsBits from '../tabs-bits';

// Only export Card components that actually exist
export { default as Card } from './Card.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardFooter } from './CardFooter.svelte';

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
