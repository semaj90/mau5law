// Compatibility barrel for named imports from '$lib/components/ui/Card'
// Ensures `import { Card, CardHeader, ... } from '$lib/components/ui/Card'` works (JS runtime friendly)

export { default as Card } from './card/Card.svelte';
export { default as CardHeader } from './card/CardHeader.svelte';
export { default as CardContent } from './card/CardContent.svelte';
export { default as CardFooter } from './card/CardFooter.svelte';
export { default as CardTitle } from './card/CardTitle.svelte';
export { default as CardDescription } from './card/CardDescription.svelte';

// Root and common aliases
export { default as Root } from './card/Card.svelte';
export { default as Header } from './card/CardHeader.svelte';
export { default as Content } from './card/CardContent.svelte';
