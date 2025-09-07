export { default as BitsDialog } from './BitsDialog.svelte';
export { default as Dialog } from './BitsDialog.svelte';

// Namespace-friendly subcomponents (so `import * as Dialog` works with `Dialog.Root`, etc.)
export { default as Root } from './DialogRoot.svelte';
export { default as Trigger } from './DialogTrigger.svelte';
export { default as Content } from './DialogContent.svelte';
export { default as Header } from './DialogHeader.svelte';
export { default as Title } from './DialogTitle.svelte';
export { default as Description } from './DialogDescription.svelte';
export { default as Footer } from './DialogFooter.svelte';

export type * from './types';

// Re-export Dialog primitive for advanced usage
export { Dialog as DialogPrimitive } from 'bits-ui';