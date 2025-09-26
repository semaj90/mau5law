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
export { Button, Card, CardContent, CardHeader, CardTitle } from './core';

// Component usage guide:
// import { Button, Card } from '$lib/components/ui';           // Core components
// import { NES } from '$lib/components/ui';                    // NES gaming style
// import { Bits } from '$lib/components/ui';                   // bits-ui based