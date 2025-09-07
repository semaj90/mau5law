// Tooltip component exports for Svelte 5
export { default as Tooltip } from './Tooltip.svelte';
export { default as TooltipContent } from './TooltipContent.svelte';
export { default as TooltipTrigger } from './TooltipTrigger.svelte';

// Re-export from tooltip subdirectory if needed
export { default as TooltipProvider } from './tooltip/TooltipProvider.svelte';

// Export types
export type TooltipProps = {
  content?: string;
  placement?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
  children?: import('svelte').Snippet;
};