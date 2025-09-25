// Compatibility barrel for named imports from '$lib/components/ui/Card'
// Ensures `import { Card, CardHeader, ... } from '$lib/components/ui/Card'` works (JS runtime friendly)
export { default as Card } from './Card/Card.svelte.js';
export { default as CardHeader } from './Card/CardHeader.svelte.js';
export { default as CardContent } from './Card/CardContent.svelte.js';
export { default as CardFooter } from './Card/CardFooter.svelte.js';
export { default as CardTitle } from './Card/CardTitle.svelte.js';
export { default as CardDescription } from './Card/CardDescription.svelte.js';
// Root and common aliases
export { default as Root } from './Card/Card.svelte.js';
export { default as Header } from './Card/CardHeader.svelte.js';
export { default as Content } from './Card/CardContent.svelte.js';
