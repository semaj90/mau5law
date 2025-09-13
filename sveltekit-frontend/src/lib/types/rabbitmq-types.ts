/**
 * RabbitMQ Types for Legal AI Processing
 */

export type JobType =
  // Original types
  | 'document-analysis'
  | 'entity-extraction'
  | 'legal-classification'
  | 'risk-assessment'
  | 'summary-generation'
  | 'recommendation-engine'
  | 'similarity-search'
  | 'evidence-processing'
  | 'case-analysis'
  | 'compliance-check'
  // Additional types from orchestrator
  | 'legal_document_analysis'
  | 'cuda_acceleration'
  | 'vector_embedding'
  | 'case_similarity'
  | 'evidence-analysis'
  | 'relationship-mapping'
  | 'pattern-detection'
  | 'forensic-timeline';

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export interface JobDefinition {
  id: string;
  type: JobType;
  priority: number;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  dependencies?: string[];
  createdAt: Date;
  updatedAt: Date;
  retryCount?: number;
  maxRetries?: number;
}

export interface ProcessingMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingTime: number;
  averageProcessingTime: number;
  throughput: number;
  errorRate: number;
  queueDepth: number;
  activeWorkers: number;
}

export interface QueueConfig {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  exclusive: boolean;
  arguments?: Record<string, any>;
}

export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable: boolean;
  autoDelete: boolean;
  arguments?: Record<string, any>;
}

export interface RabbitMQConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost?: string;
  heartbeat?: number;
  connectionTimeout?: number;
}