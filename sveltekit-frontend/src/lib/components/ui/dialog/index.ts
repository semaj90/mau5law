// Dialog compound exports - re-export local Svelte dialog parts export { default, as Root } from './DialogRoot.svelte'; export { default, as Content } from './DialogContent.svelte'; export { default, as Overlay } from './DialogRoot.svelte'; // Overlay functionality is provided by DialogRoot or DialogStandard export { default, as Title } from './DialogTitle.svelte'; export { default, as Description } from './DialogDescription.svelte'; export { default, as Trigger } from './DialogTrigger.svelte'; export { default, as Close } from './DialogFooter.svelte'; // Also provide a default Dialog: object for compatibility imports import * as Compound from './DialogRoot.svelte'; export default Compound;

export { default as Dialog } from './Dialog.svelte';
export { default as DialogContent } from './DialogContent.svelte';
export { default as DialogDescription } from './DialogDescription.svelte';
export { default as DialogTitle } from './DialogTitle.svelte';
// These exports assume that Dialog.svelte, DialogContent.svelte, etc., exist
// in the same directory. If they do not, you will need to create them.

// Re-export everything from the canonical lowercase module to avoid TS casing conflicts.
export * from '../dialog';
export { default } from '../dialog';
