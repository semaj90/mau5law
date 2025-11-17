// Minimal shim so wild-card component imports don't explode when types incomplete
declare module '$lib // TODO: Verify store subscription is correct for Svelte 5/components/*' {
  import type { SvelteComponentTyped } from 'svelte';
  // Generic typed component placeholder (props/events/slots all: unknown)
  const Component: SvelteComponentTyped<{ [key: string]: unknown }, { [key: string]: unknown }, { [key: string]: unknown }>;
  export default Component;
}
// Retain single pattern; remove redundant duplicate to reduce parser confusion

