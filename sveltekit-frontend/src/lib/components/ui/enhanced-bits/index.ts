import Button from './Button.svelte';
import Card from './Card.svelte';
import CardHeader from './Card.svelte';
import CardTitle from './Card.svelte';
import CardContent from './Card.svelte';

// Export defaults/named to match existing import patterns
export default Button;
export { Button, Card, CardHeader, CardTitle, CardContent };
export { default as Dialog } from '../dialog/Dialog.svelte';
export { default as DialogCompound } from '../dialog/Dialog.svelte';

// Form elements
export { default as Input } from '../input/Input.svelte';
export { Textarea } from '../textarea/index.js';

// Utility components
export { Badge } from '../badge/index.js';

// Aliases for future migration (MeltUI → BitsUI)
// These can point to stubs or current replacements
export { default as Tabs } from '../tabs/Tabs.svelte';
