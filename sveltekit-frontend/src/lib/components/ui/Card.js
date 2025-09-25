// Compatibility barrel for named imports from '$lib/components/ui/Card'
// Ensures `import { Card, CardHeader, ... } from '$lib/components/ui/Card'` works (JS runtime friendly)
export { default as Card } from './card/Card.svelte.js';
export { default as CardHeader } from './card/CardHeader.svelte.js';
export { default as CardContent } from './card/CardContent.svelte.js';
export { default as CardFooter } from './card/CardFooter.svelte.js';
export { default as CardTitle } from './card/CardTitle.svelte.js';
export { default as CardDescription } from './card/CardDescription.svelte.js';
// Root and common aliases
export { default as Root } from './card/Card.svelte.js';
export { default as Header } from './card/CardHeader.svelte.js';
export { default as Content } from './card/CardContent.svelte.js';
