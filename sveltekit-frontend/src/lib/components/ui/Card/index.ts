
// Re-export from enhanced-bits with fallback to local components
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '$lib/components/ui/enhanced-bits';

// Compound component structure for * as Card imports
export { Card as Root } from '$lib/components/ui/enhanced-bits';
export { CardHeader as Header } from '$lib/components/ui/enhanced-bits';
export { CardTitle as Title } from '$lib/components/ui/enhanced-bits';
export { CardDescription as Description } from '$lib/components/ui/enhanced-bits';
export { CardContent as Content } from '$lib/components/ui/enhanced-bits';
export { CardFooter as Footer } from '$lib/components/ui/enhanced-bits';
