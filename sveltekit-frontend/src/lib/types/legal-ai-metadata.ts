// Shared Legal AI metadata type used by tests and services
// This is a flexible, backward-compatible shape that maps to the current PNGEmbedExtractor metadata

export interface LegalAIMetadataEntity {
  name: string;
  type: string;
  confidence: number;
}

export interface LegalAIClassifications {
  documentType?: string;
  jurisdiction?: string;
  urgency?: string;
  confidentiality?: string;
  [key: string]: unknown;
}

export interface ProcessingStep {
  step: string;
  durationMs?: number; // legacy tests use durationMs
  duration_ms?: number; // new extractor uses duration_ms
  success: boolean;
  metadata?: Record<string, any>;
}

export interface LegalAIMetadata {
  // Legacy/test fields
  processingId?: string;
  version: string;
  timestamp?: string; // legacy
  created_at?: string; // new extractor
  confidence: number;
  summary: string;
  entities: LegalAIMetadataEntity[];
  classifications: LegalAIClassifications;
  riskAssessment?: string; // legacy
  risk_assessment?: 'low' | 'medium' | 'high' | 'critical'; // new
  complianceFlags?: string[];
  keyPhrases?: string[];
  processingChain: ProcessingStep[];
  semanticHash?: string; // legacy
  embeddings?: { semantic_hash?: string; text_embedding?: number[] };
  additionalData?: Record<string, any>;
}

export type { LegalAIMetadata as DefaultLegalAIMetadata };
