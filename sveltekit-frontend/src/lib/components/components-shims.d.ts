// Minimal shim so wild-card component imports don't explode when types incomplete
declare module '$lib/components/*' {
  import type { SvelteComponentTyped } from 'svelte';
  // Generic typed component placeholder (props/events/slots all any)
  const Component: SvelteComponentTyped<
    Record<string, any>,
    Record<string, any>,
    Record<string, any>
  >;
  export default Component;
}

// Retain single pattern; remove redundant duplicate to reduce parser confusion
