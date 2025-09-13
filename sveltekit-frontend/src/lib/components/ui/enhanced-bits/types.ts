
// Enhanced Bits UI Component Types
// Production-ready TypeScript definitions for legal AI UI components

export interface ComponentModule {
  name: string;
  default: any;
}

export interface EnhancedComponentConfig {
  name: string;
  component: ComponentModule;
  priority: number;
  category: 'form' | 'display' | 'interaction' | 'layout';
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
}

export interface ComponentLoadResult {
  success: boolean;
  component?: ComponentModule;
  error?: string;
  metrics?: PerformanceMetrics;
}

export type ComponentPriority = 'high' | 'medium' | 'low';
export type ComponentCategory = 'form' | 'display' | 'interaction' | 'layout';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Chat and recommendation types for UI components
export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}