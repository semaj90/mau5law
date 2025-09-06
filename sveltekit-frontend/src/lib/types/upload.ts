/**
 * Enhanced File Upload System with GPU Acceleration and RAG Pipeline Integration
 * Comprehensive type definitions for legal document processing with XState orchestration
 */

// XState service type (fallback if package not available)
export type XStateService = any;

// Core file upload state types
export interface FileUploadState {
  status:
    | 'idle'
    | 'uploading'
    | 'processing'
    | 'gpu-processing'
    | 'ocr-processing'
    | 'embedding'
    | 'complete'
    | 'error';
  progress: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt?: Date;
  error?: string;
  processingStage?: ProcessingStage;
  metadata?: FileMetadata;
  analysis?: UploadAnalysisResult;
}

export interface ProcessingStage {
  current:
    | 'upload'
    | 'ocr'
    | 'yolo-detection'
    | 'content-extraction'
    | 'embedding'
    | 'storage'
    | 'indexing';
  total: number;
  completed: number;
  details?: string;
}

// GPU acceleration configuration
export interface GPUUploadConfig {
  enabled: boolean;
  deviceId?: number;
  memoryFraction?: number;
  batchSize?: number;
  accelerateOCR?: boolean;
  accelerateEmbedding?: boolean;
  webgpuEnabled?: boolean;
  cudaSupport?: boolean;
}

// RAG Pipeline Integration
export interface RAGPipelineConfig {
  enabled: boolean;
  extractText: boolean;
  generateEmbeddings: boolean;
  storeVectors: boolean;
  updateIndex: boolean;
  chunkSize?: number;
  overlapSize?: number;
  embeddingModel?: 'legal-bert' | 'sentence-transformers' | 'nomic-embed-text';
  vectorStorage?: 'qdrant' | 'pgvector' | 'neo4j';
}

// OCR and Content Extraction
export interface OCRConfig {
  enabled: boolean;
  engines: ('tesseract' | 'langextract' | 'google-vision' | 'azure-ocr')[];
  languages: string[];
  confidenceThreshold?: number;
  preprocessImages?: boolean;
  enhanceContrast?: boolean;
  deskew?: boolean;
}

// YOLO Object Detection Configuration
export interface YOLOConfig {
  enabled: boolean;
  model?: 'yolov8' | 'yolov9' | 'yolo-legal-docs';
  confidenceThreshold?: number;
  detectTables?: boolean;
  detectSignatures?: boolean;
  detectSeals?: boolean;
  detectTextRegions?: boolean;
}

// Enhanced processing pipeline
export interface ProcessingPipeline {
  gpu: GPUUploadConfig;
  rag: RAGPipelineConfig;
  ocr: OCRConfig;
  yolo: YOLOConfig;
  customSteps?: ProcessingStep[];
}

export interface ProcessingStep {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  dependencies?: string[];
  config?: Record<string, any>;
}

// File metadata and analysis results
export interface FileMetadata {
  mimeType: string;
  encoding?: string;
  dimensions?: { width: number; height: number };
  pageCount?: number;
  language?: string;
  documentType?: 'contract' | 'deed' | 'evidence' | 'report' | 'correspondence' | 'unknown';
  classification?: DocumentClassification;
}

export interface DocumentClassification {
  type: string;
  confidence: number;
  categories: string[];
  legalEntities?: string[];
  keyTerms?: string[];
}

export interface UploadProcessingResult {
  contentExtracted: boolean;
  textLength: number;
  embeddingsGenerated: boolean;
  objectsDetected?: DetectedObject[];
  ocrResults?: OCRResult[];
  legalAnalysis?: UploadAnalysisResult;
  processingTime: number;
  processingSteps: CompletedStep[];
}

export interface DetectedObject {
  type: 'table' | 'signature' | 'seal' | 'text-block' | 'image' | 'diagram';
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  page?: number;
  extractedText?: string;
}

export interface OCRResult {
  engine: string;
  page: number;
  text: string;
  confidence: number;
  words: OCRWord[];
  processingTime: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface UploadAnalysisResult {
  documentType: string;
  parties: string[];
  keyDates: Date[];
  obligations: string[];
  risks: string[];
  compliance: ComplianceCheck[];
  summary: string;
}

export interface ComplianceCheck {
  rule: string;
  status: 'compliant' | 'non-compliant' | 'unclear';
  details: string;
}

export interface CompletedStep {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  result?: unknown;
}

// XState Machine Integration for Complex Upload Workflows
export interface XStateUploadMachine {
  currentState: string;
  context: UploadMachineContext;
  events: UploadMachineEvent[];
  services?: Record<string, XStateService>;
}

export interface UploadMachineContext {
  files: FileUploadState[];
  pipeline: ProcessingPipeline;
  totalSteps: number;
  completedSteps: number;
  errors: string[];
  retryCount: number;
  maxRetries: number;
  batchId?: string;
  userId?: string;
  caseId?: string;
}

export type UploadMachineEvent =
  | { type: 'UPLOAD_START'; files: File[] }
  | { type: 'UPLOAD_PROGRESS'; fileId: string; progress: number }
  | { type: 'UPLOAD_COMPLETE'; fileId: string }
  | { type: 'PROCESSING_START'; fileId: string }
  | { type: 'PROCESSING_STEP'; fileId: string; step: string; progress: number }
  | { type: 'PROCESSING_COMPLETE'; fileId: string; result: UploadAnalysisResult }
  | { type: 'ERROR'; fileId?: string; error: string }
  | { type: 'RETRY'; fileId: string }
  | { type: 'CANCEL'; fileId?: string }
  | { type: 'RESET' };

// Cache Strategy for Upload Components
export interface UploadCacheConfig {
  strategy: 'lru' | 'redis' | 'memory' | 'hybrid';
  maxSize?: number;
  ttl?: number;
  persistentStorage?: boolean;
  compression?: boolean;
}

// Component Props Interface
export interface EnhancedFileUploadProps {
  caseId?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  pipeline?: Partial<ProcessingPipeline>;
  cache?: UploadCacheConfig;
  onUploadComplete?: (results: UploadAnalysisResult[]) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  compact?: boolean;
  enableGPU?: boolean;
  enableRAG?: boolean;
  autoProcess?: boolean;
  showPreview?: boolean;
  showAnalysis?: boolean;
}

// Utility types for component state management
export type UploadStatus = FileUploadState['status'];
export type ProcessingStageType = ProcessingStage['current'];

// Event emitter types for upload events
export interface UploadEventDetail<T = any> {
  fileId?: string;
  data: T;
  timestamp: Date;
}

export type UploadEventMap = {
  'upload:start': UploadEventDetail<{ files: File[] }>;
  'upload:progress': UploadEventDetail<{ progress: number }>;
  'upload:complete': UploadEventDetail<{ result: UploadAnalysisResult }>;
  'processing:start': UploadEventDetail<{ pipeline: ProcessingPipeline }>;
  'processing:step': UploadEventDetail<{ step: string; progress: number }>;
  'processing:complete': UploadEventDetail<{ result: UploadAnalysisResult }>;
  'gpu:accelerated': UploadEventDetail<{ operation: string; speedup: number }>;
  'error:occurred': UploadEventDetail<{ error: string; recoverable: boolean }>;
  'cache:hit': UploadEventDetail<{ key: string; size: number }>;
  'cache:miss': UploadEventDetail<{ key: string }>;
};
