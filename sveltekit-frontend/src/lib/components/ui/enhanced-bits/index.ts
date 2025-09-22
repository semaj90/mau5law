// Enhanced-Bits UI Library - Production TypeScript Barrel Exports
// Legal AI Platform - SvelteKit 2 + Svelte 5 + SSR Compatible
// Generated: 2025-09-21 | Version: 2.0

// ======================================================================
// CORE UI COMPONENTS (SSR-Safe)
// ======================================================================

// Base Interactive Components (Enhanced-Bits + Bits-UI Integration)
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Dialog } from './Dialog.svelte';
export { default as Label } from '../Label.svelte';
export { default as Select } from './Select.svelte';
export { default as Tooltip } from './Tooltip.svelte';
export { default as Popover } from './Popover.svelte';
export { default as Tabs } from './Tabs.svelte';
export { default as ThemeToggle } from './ThemeToggle.svelte';
export { default as AnimationLibrary } from './AnimationLibrary.svelte';
export { default as ThemeProvider } from './ThemeProvider.svelte';
export { default as DocumentCard } from './DocumentCard.svelte';
export { default as ThemeDemo } from './ThemeDemo.svelte';
export { default as Sidebar } from './Sidebar.svelte';
export { default as DraggableModal } from './DraggableModal.svelte';
export { default as EvidenceBoard } from './EvidenceBoard.svelte';
export { default as Toolbar } from './Toolbar.svelte';
export { default as YoRHaSearchBar } from './YoRHaSearchBar.svelte';
export { default as SidebarDemo } from './SidebarDemo.svelte';

// Bits-UI Re-exports with Enhanced Styling
export {
  Button as BitsButton,
  Dialog as BitsDialog,
  Card as BitsCard,
  Select as BitsSelect,
  Popover as BitsPopover,
  DropdownMenu as BitsDropdownMenu,
  ContextMenu as BitsContextMenu,
  Tooltip as BitsTooltip,
  Combobox as BitsCombobox,
  Toolbar as BitsToolbar,
  Resizable as BitsResizable
} from 'bits-ui';

// Conditional exports for components that may not exist
let Badge, Icon, Avatar;
try {
  Badge = await import('../Badge.svelte').then(m => m.default).catch(() => null);
  Icon = await import('../Icon.svelte').then(m => m.default).catch(() => null);
  Avatar = await import('../Avatar.svelte').then(m => m.default).catch(() => null);
} catch {
  // Fallback for SSR or missing components
}

export { Badge, Icon, Avatar };

// ======================================================================
// CARD COMPOUND COMPONENTS (shadcn-style)
// ======================================================================

import CardComponent from './Card.svelte';
import CardHeaderComponent from './CardHeader.svelte';
import CardTitleComponent from './CardTitle.svelte';
import CardDescriptionComponent from './CardDescription.svelte';
import CardContentComponent from './CardContent.svelte';
import CardFooterComponent from './CardFooter.svelte';

// Export individual components
export { default as Card } from './Card.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardFooter } from './CardFooter.svelte';

// Compound component pattern for shadcn-style imports
export const CardCompound = Object.assign(CardComponent, {
  Root: CardComponent,
  Header: CardHeaderComponent,
  Title: CardTitleComponent,
  Description: CardDescriptionComponent,
  Content: CardContentComponent,
  Footer: CardFooterComponent,
});

// ======================================================================
// EVIDENCE LAYER COMPONENTS (Legal AI Specific)
// ======================================================================

// Dynamic imports for evidence components that may not exist
const evidenceComponents = {
  EvidenceCard: () => import('./EvidenceCard.svelte').catch(() => null),
  EvidenceThumbnail: () => import('./EvidenceThumbnail.svelte').catch(() => null),
  EvidenceAIAnalysis: () => import('./EvidenceAIAnalysis.svelte').catch(() => null),
  EvidenceTimeline: () => import('./EvidenceTimeline.svelte').catch(() => null),
  EvidenceTags: () => import('./EvidenceTags.svelte').catch(() => null),
  EvidenceHash: () => import('./EvidenceHash.svelte').catch(() => null),
};

// ======================================================================
// FORMS & INPUT COMPONENTS
// ======================================================================

export { default as SearchInput } from './SearchInput.svelte';

// Dynamic imports for form components
const formComponents = {
  FileUploader: () => import('./FileUploader.svelte').catch(() => null),
  MultiSelect: () => import('./MultiSelect.svelte').catch(() => null),
  DatePicker: () => import('./DatePicker.svelte').catch(() => null),
  RichTextEditor: () => import('./RichTextEditor.svelte').catch(() => null),
};

// ======================================================================
// DASHBOARD & LAYOUT COMPONENTS
// ======================================================================

// Dynamic imports for layout components
const layoutComponents = {
  Board: () => import('./Board.svelte').catch(() => null),
  Sidebar: () => import('../layout/Sidebar.svelte').catch(() => null),
  Toolbar: () => import('./Toolbar.svelte').catch(() => null),
  SplitView: () => import('./SplitView.svelte').catch(() => null),
};

// ======================================================================
// VISUALIZATION COMPONENTS
// ======================================================================

// Dynamic imports for visualization components
const visualizationComponents = {
  ConfidenceBar: () => import('./ConfidenceBar.svelte').catch(() => null),
  TimelineGraph: () => import('./TimelineGraph.svelte').catch(() => null),
  Heatmap: () => import('./Heatmap.svelte').catch(() => null),
  EntityCloud: () => import('./EntityCloud.svelte').catch(() => null),
};

// ======================================================================
// NOTIFICATION COMPONENTS
// ======================================================================

// Dynamic imports for notification components
const notificationComponents = {
  Toast: () => import('./Toast.svelte').catch(() => null),
  ProgressBar: () => import('./ProgressBar.svelte').catch(() => null),
  LoaderOverlay: () => import('./LoaderOverlay.svelte').catch(() => null),
  Alert: () => import('./Alert.svelte').catch(() => null),
  AlertDescription: () => import('./AlertDescription.svelte').catch(() => null),
};

// ======================================================================
// UTILITY COMPONENTS
// ======================================================================

// Dynamic imports for utility components
const utilityComponents = {
  CopyButton: () => import('./CopyButton.svelte').catch(() => null),
  Collapsible: () => import('./Collapsible.svelte').catch(() => null),
  DebugPanel: () => import('./DebugPanel.svelte').catch(() => null),
};

// ======================================================================
// AI & SPECIALIZED COMPONENTS (Verified Safe)
// ======================================================================

export { default as AIChatMessage } from './AIChatMessage.svelte';
export { default as AIRecommendations } from './AIRecommendations.svelte';
export { default as EmbeddingForm } from './EmbeddingForm.svelte';
export { default as EmbeddingSearch } from './EmbeddingSearch.svelte';
export { default as GemmaEmbeddingDemo } from './GemmaEmbeddingDemo.svelte';
export { default as KeyboardMapping } from './KeyboardMapping.svelte';
export { default as LinkButton } from './LinkButton.svelte';

// ======================================================================
// NES GAMING ENHANCED COMPONENTS
// ======================================================================

export { default as NESButton } from './NESButton.svelte';
export { default as NESCard } from './NESCard.svelte';
export { default as NESModal } from './NESModal.svelte';
export { default as NESGamingShowcase } from './NESGamingShowcase.svelte';

// ======================================================================
// COMPOUND COMPONENT SYSTEMS
// ======================================================================

// Tabs compound component export
export * as TabsBits from '../tabs-bits';

// Modal/Dialog compound system
import DialogComponent from './Dialog.svelte';
export const DialogCompound = Object.assign(DialogComponent, {
  Root: DialogComponent,
  Content: DialogComponent,
  Trigger: Button, // Use Button as trigger
  Title: CardTitleComponent,
  Description: CardDescriptionComponent,
});

// ======================================================================
// TYPE DEFINITIONS & INTERFACES
// ======================================================================

// Re-export all types from types.ts
export * from './types';

// Additional barrel-specific types
export interface ComponentBarrelConfig {
  name: string;
  component: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'core' | 'evidence' | 'forms' | 'layout' | 'visualization' | 'ai';
  ssrSafe: boolean;
  dependencies?: string[];
}

export interface CustomDesignTokens {
  colors: {
    primary: string;
    secondary: string;
    evidence: string;
    ai: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
    lineHeight: Record<string, string>;
  };
  nes: {
    pixelSize: string;
    borderWidth: string;
    shadowDepth: string;
  };
}

// ======================================================================
// UTILITY FUNCTIONS FOR CUSTOM DESIGN INTEGRATION
// ======================================================================

export function createCustomTheme(tokens: Partial<CustomDesignTokens>): CustomDesignTokens {
  return {
    colors: {
      primary: '#00ff41',
      secondary: '#ff6b35',
      evidence: '#ffd700',
      ai: '#9d4edd',
      success: '#06d6a0',
      warning: '#f18701',
      error: '#d00000',
      ...tokens.colors
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '3rem',
      ...tokens.spacing
    },
    typography: {
      fontFamily: '"Courier New", monospace',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem'
      },
      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75'
      },
      ...tokens.typography
    },
    nes: {
      pixelSize: '2px',
      borderWidth: '4px',
      shadowDepth: '4px',
      ...tokens.nes
    }
  };
}

export function applyCustomDesign(element: HTMLElement, theme: CustomDesignTokens): void {
  const style = element.style;
  style.setProperty('--enhanced-bits-primary', theme.colors.primary);
  style.setProperty('--enhanced-bits-secondary', theme.colors.secondary);
  style.setProperty('--enhanced-bits-font-family', theme.typography.fontFamily);
  style.setProperty('--enhanced-bits-border-width', theme.nes.borderWidth);
}

// ======================================================================
// SSR-SAFE BARREL EXPORT REGISTRY
// ======================================================================

export const COMPONENT_REGISTRY: Record<string, ComponentBarrelConfig> = {
  // Critical SSR-safe components
  Button: { name: 'Button', component: Button, priority: 'critical', category: 'core', ssrSafe: true },
  Input: { name: 'Input', component: Input, priority: 'critical', category: 'core', ssrSafe: true },
  Label: { name: 'Label', component: Label, priority: 'critical', category: 'core', ssrSafe: true },
  Card: { name: 'Card', component: Card, priority: 'critical', category: 'core', ssrSafe: true },
  Select: { name: 'Select', component: Select, priority: 'critical', category: 'core', ssrSafe: true },
  Tooltip: { name: 'Tooltip', component: Tooltip, priority: 'high', category: 'core', ssrSafe: true },
  Popover: { name: 'Popover', component: Popover, priority: 'high', category: 'core', ssrSafe: true },
  Tabs: { name: 'Tabs', component: Tabs, priority: 'high', category: 'core', ssrSafe: true },
  ThemeToggle: { name: 'ThemeToggle', component: ThemeToggle, priority: 'high', category: 'core', ssrSafe: true },
  AnimationLibrary: { name: 'AnimationLibrary', component: AnimationLibrary, priority: 'medium', category: 'core', ssrSafe: true },
  ThemeProvider: { name: 'ThemeProvider', component: ThemeProvider, priority: 'critical', category: 'core', ssrSafe: true },
  DocumentCard: { name: 'DocumentCard', component: DocumentCard, priority: 'high', category: 'core', ssrSafe: true },
  Sidebar: { name: 'Sidebar', component: Sidebar, priority: 'high', category: 'layout', ssrSafe: true },
  DraggableModal: { name: 'DraggableModal', component: DraggableModal, priority: 'high', category: 'layout', ssrSafe: true },
  EvidenceBoard: { name: 'EvidenceBoard', component: EvidenceBoard, priority: 'high', category: 'ai', ssrSafe: true },
  Toolbar: { name: 'Toolbar', component: Toolbar, priority: 'high', category: 'layout', ssrSafe: true },
  YoRHaSearchBar: { name: 'YoRHaSearchBar', component: YoRHaSearchBar, priority: 'high', category: 'ai', ssrSafe: true },

  // AI-specific components
  SearchInput: { name: 'SearchInput', component: SearchInput, priority: 'high', category: 'ai', ssrSafe: true },
  AIChatMessage: { name: 'AIChatMessage', component: AIChatMessage, priority: 'high', category: 'ai', ssrSafe: true },
};

// Function to get SSR-safe components only
export function getSSRSafeComponents(): ComponentBarrelConfig[] {
  return Object.values(COMPONENT_REGISTRY).filter(config => config.ssrSafe);
}

// Function to get components by category
export function getComponentsByCategory(category: ComponentBarrelConfig['category']): ComponentBarrelConfig[] {
  return Object.values(COMPONENT_REGISTRY).filter(config => config.category === category);
}

// ======================================================================
// DYNAMIC COMPONENT LOADER FOR CUSTOM DESIGNS
// ======================================================================

export async function loadComponent(name: string): Promise<any> {
  try {
    // Try to load from evidence components first
    if (evidenceComponents[name as keyof typeof evidenceComponents]) {
      const component = await evidenceComponents[name as keyof typeof evidenceComponents]();
      return component?.default || component;
    }

    // Try form components
    if (formComponents[name as keyof typeof formComponents]) {
      const component = await formComponents[name as keyof typeof formComponents]();
      return component?.default || component;
    }

    // Try layout components
    if (layoutComponents[name as keyof typeof layoutComponents]) {
      const component = await layoutComponents[name as keyof typeof layoutComponents]();
      return component?.default || component;
    }

    // Try visualization components
    if (visualizationComponents[name as keyof typeof visualizationComponents]) {
      const component = await visualizationComponents[name as keyof typeof visualizationComponents]();
      return component?.default || component;
    }

    // Try notification components
    if (notificationComponents[name as keyof typeof notificationComponents]) {
      const component = await notificationComponents[name as keyof typeof notificationComponents]();
      return component?.default || component;
    }

    // Try utility components
    if (utilityComponents[name as keyof typeof utilityComponents]) {
      const component = await utilityComponents[name as keyof typeof utilityComponents]();
      return component?.default || component;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to load component: ${name}`, error);
    return null;
  }
}

// ======================================================================
// CUSTOM DESIGN INTEGRATION HELPERS
// ======================================================================

export interface CustomComponentConfig {
  name: string;
  component: any;
  customStyles?: Record<string, string>;
  nesTheme?: boolean;
  animations?: boolean;
}

export function registerCustomComponent(config: CustomComponentConfig): void {
  COMPONENT_REGISTRY[config.name] = {
    name: config.name,
    component: config.component,
    priority: 'medium',
    category: 'core',
    ssrSafe: true,
  };
}

export function createNESStyledComponent(baseComponent: any, customStyles: Record<string, string> = {}) {
  return {
    ...baseComponent,
    styles: {
      border: '4px solid #000',
      fontFamily: '"Courier New", monospace',
      imageRendering: 'pixelated',
      ...customStyles
    }
  };
}