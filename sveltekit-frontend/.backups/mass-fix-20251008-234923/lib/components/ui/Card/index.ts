// Card Compound Component Exports - SSR-Safe
// shadcn-style compatibility layer for enhanced-bits
// Re-export enhanced-bits Card components for compound usage
export { Card as Root } from '$lib/components/ui/enhanced-bits';
export { CardHeader as Header } from '$lib/components/ui/enhanced-bits';
export { CardTitle as Title } from '$lib/components/ui/enhanced-bits';
export { CardDescription as Description } from '$lib/components/ui/enhanced-bits';
export { CardContent as Content } from '$lib/components/ui/enhanced-bits';
export { CardFooter as Footer } from '$lib/components/ui/enhanced-bits';
// Also export with standard names for flexibility
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '$lib/components/ui/enhanced-bits';
// Note: CardCompound does not exist in enhanced-bits, so we don't re-export it here.
