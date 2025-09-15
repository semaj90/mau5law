// Type definitions for predictor API endpoints

import type { RequestEvent } from '@sveltejs/kit';

export type RequestHandler = (event: RequestEvent) => Response | Promise<Response>;

export interface PredictionResult {
  action: string;
  p: number;
}

export interface PredictorStats {
  totalTransitions: number;
  uniqueActions: number;
  cacheEnabled: boolean;
  lastSync: number;
  pendingUpdates: number;
  redisConnected: boolean;
}

export interface RecordActionRequest {
  userId: string;
  action: string;
  context?: {
    docId?: string;
    query?: string;
    timestamp?: number;
  };
}

export interface PredictActionRequest {
  action: string;
  context?: {
    docId?: string;
    query?: string;
  };
  topK?: number;
  enhancedMode?: boolean;
}

export interface RecordActionResponse {
  success: boolean;
  action: string;
  userId: string;
  context?: any;
  stats: Partial<PredictorStats>;
  timestamp: number;
}

export interface PredictActionResponse {
  action: string;
  predictions: PredictionResult[];
  context: any;
  enhancedMode: boolean;
  topK: number;
  stats: PredictorStats;
  performance: {
    predictionsGenerated: number;
    cacheHit: boolean;
    simdAccelerated: boolean;
  };
  timestamp: number;
}

export interface BulkPredictResponse {
  results: Array<{
    action: string;
    predictions: PredictionResult[];
    context: any;
    enhancedMode: boolean;
  }>;
  totalRequests: number;
  stats: Partial<PredictorStats>;
  timestamp: number;
}