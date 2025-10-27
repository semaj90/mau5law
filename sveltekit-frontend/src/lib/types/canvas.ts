import type { Case, Evidence } from './database'; // Assuming these types are defined in database.ts

// Define specific interfaces for node data
export interface Person {
  id: string;
  name: string;
  // Add other relevant person properties here
}

export interface CanvasConnectionData {
  id: string;
  label?: string;
  // Add other relevant connection data properties here if different from CanvasConnection
}

// Canvas types for interactive features
export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'case' | 'evidence' | 'person' | 'connection';
  data: Case | Evidence | Person | CanvasConnectionData; // More specific type
}
export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'related' | 'involves' | 'contains';
  strength: number;
}
export interface InteractiveCanvasState {
  id?: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  animation?: string;
  frame?: number;
  fabricJSON?: string;
  metadata?: { [key: string]: unknown }; // Changed from any to unknown
}
