/**
 * Legal Components Export
 * Specialized legal workflow and document processing components
 */

export { default as CustodyTimeline } from './CustodyTimeline.svelte';
export { default as EnhancedLegalProcessor } from './EnhancedLegalProcessor.svelte';
export { default as IntegrityVerification } from './IntegrityVerification.svelte';
export { default as WorkflowProgress } from './WorkflowProgress.svelte';

export type LegalDocumentType = 'contract' | 'evidence' | 'brief' | 'citation' | 'deposition';
export type WorkflowStage = 'intake' | 'processing' | 'review' | 'approved' | 'archived';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'requires_attention';

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  title: string;
  content: string;
  stage: WorkflowStage;
  verification?: VerificationStatus;
  metadata?: Record<string, any>;
}