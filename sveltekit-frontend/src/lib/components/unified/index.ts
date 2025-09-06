/**
 * Unified UI Kit - Phase 14
 * 
 * Perfect integration of bits-ui v2 + Melt Svelte 5 + UnoCSS
 * Features:
 * - GPU-accelerated animations with WebGL/WebGPU
 * - Legal AI context integration
 * - NES-style memory constraints and pixel effects
 * - Real-time collaboration support
 */

export { default as UnifiedButton } from './UnifiedButton.svelte';
export { default as UnifiedDialog } from './UnifiedDialog.svelte';

// Export types for TypeScript support
export type UnifiedButtonProps = {
  variant?: 'primary' | 'secondary' | 'legal' | 'evidence' | 'case' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  legalContext?: {
    confidence?: number;
    caseType?: 'contract' | 'evidence' | 'brief' | 'citation';
    aiSuggested?: boolean;
    riskLevel?: 'low' | 'medium' | 'high';
  };
  gpuEffects?: boolean;
  glowIntensity?: number;
  pixelated?: boolean;
  nesStyle?: boolean;
  onclick?: (event: MouseEvent) => void;
  class?: string;
};

export type UnifiedDialogProps = {
  open?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  variant?: 'default' | 'legal' | 'evidence' | 'case' | 'nes';
  glassmorphism?: boolean;
  pixelated?: boolean;
  webgpuEffects?: boolean;
  collaboration?: {
    enabled: boolean;
    users?: Array<{
      id: string;
      name: string;
      avatar?: string;
      color: string;
      cursor?: { x: number; y: number };
    }>;
    sessionId?: string;
  };
  legalContext?: {
    caseId?: string;
    documentType?: 'contract' | 'evidence' | 'brief' | 'citation';
    aiAnalysis?: {
      riskLevel: 'low' | 'medium' | 'high';
      confidence: number;
      suggestions: string[];
    };
  };
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  class?: string;
};