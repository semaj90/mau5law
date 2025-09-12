/**
 * RabbitMQ Types for Legal AI Processing
 */

export type JobType =
  | 'document-analysis'
  | 'entity-extraction'
  | 'legal-classification'
  | 'risk-assessment'
  | 'summary-generation'
  | 'recommendation-engine'
  | 'similarity-search'
  | 'evidence-processing'
  | 'case-analysis'
  | 'compliance-check';

export type JobStatus =
  | 'pending'
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