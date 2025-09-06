/**
 * Canvas & Visual Editor Components Export
 * Advanced visual editing and canvas manipulation components
 */

export { default as AdvancedEditor } from './AdvancedEditor.svelte';
export { default as EvidenceCanvasEditor } from './EvidenceCanvasEditor.svelte';
export { default as EvidenceNode } from './EvidenceNode.svelte';
export { default as ReportNode } from './ReportNode.svelte';

export type CanvasNodeType = 'evidence' | 'report' | 'connection' | 'note';
export type CanvasPosition = { x: number; y: number };
export type CanvasSize = { width: number; height: number };

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: CanvasPosition;
  size: CanvasSize;
  data: Record<string, any>;
}