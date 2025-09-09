// Re-export from enhanced-bits with fallback compatibility
export { 
  Dialog,
  Button as DialogTrigger,
  CardTitle as DialogTitle,
  CardDescription as DialogDescription
} from '$lib/components/ui/enhanced-bits';

// Compound component structure for * as Dialog imports
export { Dialog as Root } from '$lib/components/ui/enhanced-bits';
export { Button as Trigger } from '$lib/components/ui/enhanced-bits';
export { Dialog as Content } from '$lib/components/ui/enhanced-bits';
export { CardHeader as Header } from '$lib/components/ui/enhanced-bits';
export { CardTitle as Title } from '$lib/components/ui/enhanced-bits';
export { CardDescription as Description } from '$lib/components/ui/enhanced-bits';
export { CardFooter as Footer } from '$lib/components/ui/enhanced-bits';

// Legacy exports for backward compatibility
export { Dialog as BitsDialog } from '$lib/components/ui/enhanced-bits';

export type * from './types';