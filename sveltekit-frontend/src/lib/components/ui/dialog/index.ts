// Dialog Compound Component Exports - SSR-Safe
// shadcn-style compatibility layer for enhanced-bits

// Re-export enhanced-bits Dialog components for compound usage
export { Dialog as Root } from '$lib/components/ui/enhanced-bits';
export { Dialog as Content } from '$lib/components/ui/enhanced-bits';
export { Button as Trigger } from '$lib/components/ui/enhanced-bits';
export { CardTitle as Title } from '$lib/components/ui/enhanced-bits';
export { CardDescription as Description } from '$lib/components/ui/enhanced-bits';

// Also export with standard names for flexibility
export { Dialog } from '$lib/components/ui/enhanced-bits';

// For convenience, also export the compound object
export { DialogCompound } from '$lib/components/ui/enhanced-bits';