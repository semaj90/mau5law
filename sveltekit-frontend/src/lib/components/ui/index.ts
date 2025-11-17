// Unified UI Component System
// Primary export for all UI components - Svelte 5 Ready
// Use this for consistent component imports across the application

// Core Components (Primary Use)
export * from './core';

// Specialized Component Libraries
export * as Bits from './bits';
export * as NES from './nes';

// Legacy compatibility exports (will be removed in future versions)
export { default as LegacyButton } from './Button.svelte';

// Direct imports for common components
export { default as Button } from './button/Button.svelte';
export { default as Input } from './input/Input.svelte';
export { default as Label } from './label/Label.svelte';
export { default as Card } from './Card/Card.svelte';
export { default as CardContent } from './Card/CardContent.svelte';
export { default as CardHeader } from './Card/CardHeader.svelte';
export { default as CardTitle } from './Card/CardTitle.svelte';
export { default as CardDescription } from './Card/CardDescription.svelte';
export { default as CardFooter } from './Card/CardFooter.svelte';
export { default as Dialog } from './dialog/Dialog.svelte';
export { default as DialogContent } from './dialog/DialogContent.svelte';
export { default as DialogHeader } from './dialog/DialogHeader.svelte';
export { default as DialogTitle } from './dialog/DialogTitle.svelte';
export { default as DialogDescription } from './dialog/DialogDescription.svelte';
export { default as DialogTrigger } from './dialog/DialogTrigger.svelte';
export { default as DialogOverlay } from './dialog/DialogOverlay.svelte';
export { default as Select } from './select/Select.svelte';
export { default as SelectContent } from './select/SelectContent.svelte';
export { default as SelectItem } from './select/SelectItem.svelte';
export { default as SelectTrigger } from './select/SelectTrigger.svelte';
export { default as SelectValue } from './select/SelectValue.svelte';
export { default as Textarea } from './textarea/Textarea.svelte';
export { default as Checkbox } from './checkbox/Checkbox.svelte';
export { default as Badge } from './badge/Badge.svelte';
export { default as Avatar } from './avatar/Avatar.svelte';
export { default as AvatarImage } from './avatar/AvatarImage.svelte';
export { default as AvatarFallback } from './avatar/AvatarFallback.svelte';
export { default as Search } from './search/Search.svelte';
export { default as User } from './user/User.svelte';

// Component usage guide:
// import { Button, Card } from '$lib // TODO: Verify store subscription is correct for Svelte 5/components/ui';
// Core components
// import { NES } from '$lib // TODO: Verify store subscription is correct for Svelte 5/components/ui';
// NES gaming style
// import { Bits } from '$lib // TODO: Verify store subscription is correct for Svelte 5/components/ui';
// bits-ui based

export { default as SearchBox } from './SearchBox.svelte';
