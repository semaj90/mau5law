// Form component barrel exports (fixed paths)
// Using relative paths because Form.svelte lives in the parent ui directory, not at $lib/Form.svelte
export { default as Form } from '../Form.svelte';
export { default as FormRoot } from '../Form.svelte';
export { default as FormStandard } from '../forms/FormStandard.svelte';

// Field/component aliases for API compatibility with libraries expecting shadcn-style exports
export { default as FormField } from '../Form.svelte';
export { default as FormControl } from '../Form.svelte';
export { default as FormLabel } from '../Label.svelte';
export { default as FormMessage } from '../Form.svelte';
export { default as FormDescription } from '../Form.svelte';
export { default as FormItem } from '../Form.svelte';
