// Dialog compound exports - re-export local Svelte dialog parts
export { default as Root } from './DialogRoot.svelte';
export { default as Content } from './DialogContent.svelte';
export { default as Overlay } from './DialogRoot.svelte'; // Overlay functionality is provided by DialogRoot
export { default as Title } from './DialogTitle.svelte';
export { default as Description } from './DialogDescription.svelte';
export { default as Trigger } from './DialogTrigger.svelte';
export { default as Close } from './DialogFooter.svelte'; // Close functionality is provided by DialogFooter
export { default as Header } from './DialogHeader.svelte';
export { default as Footer } from './DialogFooter.svelte';

// Also provide a default Dialog object for compatibility imports
export { default as Dialog } from './Dialog.svelte';
export { default as DialogContent } from './DialogContent.svelte';
export { default as DialogDescription } from './DialogDescription.svelte';
export { default as DialogTitle } from './DialogTitle.svelte';
export { default as DialogOverlay } from './DialogRoot.svelte';
export { default as DialogClose } from './DialogFooter.svelte';

// Re-export everything from the canonical lowercase module to avoid TS casing conflicts.
export * from '../dialog';
export { default } from '../dialog';
