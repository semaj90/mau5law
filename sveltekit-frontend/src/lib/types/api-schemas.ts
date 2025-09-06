/**
 * Type-safe API Response Schemas for Bits UI SSR
 */

// Base API Response Structure
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    cached: boolean;
    source: 'ssr' | 'api';
  };
  error?: string;
}

// User Authentication Schemas
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'admin' | 'prosecutor' | 'detective' | 'user';
  department?: string;
  jurisdiction?: string;
  practiceAreas: string[];
  barNumber?: string;
  firmName?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  permissions: string[];
  isActive: boolean;
  emailVerified?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivity {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
}

export interface AuthMeResponse {
  user: User;
  activity: UserActivity;
  authenticated: true;
  loadSource: 'cache' | 'database';
}

// System Health Schemas
export interface SystemHealth {
  overall: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    healthScore: number;
    healthyServices: number;
    totalServices: number;
    timestamp: string;
  };
  services: {
    databases: Record<string, ServiceStatus>;
    aiServices: Record<string, ServiceStatus>;
    gpuServices: Record<string, GPUServiceStatus>;
    orchestration: Record<string, ServiceStatus>;
    storage: Record<string, ServiceStatus>;
  };
  performance: {
    systemUptime: number;
    memoryUsage: MemoryUsage;
  };
  architecture: {
    platform: string;
    version: string;
    gpuArchitecture: string;
    microservices: number;
    protocols: string[];
    features: string[];
  };
}

export interface ServiceStatus {
  host: string;
  port: number;
  status: string;
}

export interface GPUServiceStatus {
  status: string;
  vram?: string;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

// Dashboard Schemas
export interface DashboardStats {
  activeCases: number;
  evidenceItems: number;
  aiAnalyses: number;
  systemUptime: number;
  cognitive?: CognitiveMetrics;
}

export interface CognitiveMetrics {
  routingEfficiency: number;
  cacheHitRatio: number;
  gpuUtilization: number;
  consciousnessLevel: number;
  quantumCoherence: number;
  timestamp: string;
}

export interface RecentActivity {
  id: string;
  type: 'case_created' | 'evidence_uploaded' | 'ai_analysis' | 'document_processed';
  title: string;
  timestamp: Date | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Case Management Schemas
export interface Case {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'active' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdBy: string;
  department?: string;
  jurisdiction?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'physical' | 'digital';
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  hash?: string;
  chainOfCustody: ChainOfCustodyEntry[];
  tags: string[];
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChainOfCustodyEntry {
  id: string;
  action: 'created' | 'accessed' | 'modified' | 'transferred' | 'analyzed';
  performedBy: string;
  timestamp: string;
  notes?: string;
  location?: string;
}

// AI Analysis Schemas
export interface AIAnalysis {
  id: string;
  caseId?: string;
  evidenceId?: string;
  type: 'sentiment' | 'entity_extraction' | 'document_classification' | 'similarity' | 'summarization';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  results?: Record<string, any>;
  confidence?: number;
  model?: string;
  parameters?: Record<string, any>;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

// Search and Query Schemas
export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResults<T = any> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Page Data Schemas for SSR
export interface HomePageData {
  userId?: string | null;
  sessionId?: string | null;
  email?: string | null;
  isAuthenticated: boolean;
  health: SystemHealth | null;
  systemInfo: SystemInfo | null;
  dashboardStats: DashboardStats;
  recentActivities: RecentActivity[];
  metrics?: CognitiveMetrics;
  loadedAt: string;
  error?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  gpuInfo: string;
  memoryUsage: string;
  nodeVersion: string;
  uptime: number;
}

export interface DashboardPageData {
  systemStatus: SystemHealth;
  multicoreStatus: MulticoreStatus | null;
  graphData: SystemGraphData;
  initialLoad: boolean;
  timestamp: string;
  error?: string;
}

export interface MulticoreStatus {
  totalWorkers: number;
  healthyWorkers: number;
  busyWorkers: number;
  queueSize: number;
  activeTasks: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
}

export interface SystemGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'database' | 'service' | 'component';
  label: string;
  position: { x: number; y: number; z: number };
  metrics: Record<string, any>;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'api' | 'data' | 'grpc';
  traffic: number;
  latency: number;
}

// Error Response Schema
export interface ErrorResponse {
  success: false;
  data: null;
  meta: {
    timestamp: string;
    cached: false;
    source: 'ssr' | 'api';
  };
  error: string;
}

// Type Guards for Runtime Validation
export function isAPIResponse<T>(obj: any): obj is APIResponse<T> {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    'data' in obj &&
    'meta' in obj &&
    obj.meta &&
    typeof obj.meta.timestamp === 'string' &&
    typeof obj.meta.cached === 'boolean' &&
    (obj.meta.source === 'ssr' || obj.meta.source === 'api')
  );
}

export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.firstName === 'string' &&
    typeof obj.lastName === 'string' &&
    typeof obj.role === 'string' &&
    Array.isArray(obj.practiceAreas) &&
    Array.isArray(obj.permissions)
  );
}

export function isCase(obj: any): obj is Case {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.priority === 'string' &&
    typeof obj.createdBy === 'string' &&
    Array.isArray(obj.tags)
  );
}

export function isEvidence(obj: any): obj is Evidence {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.caseId === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.createdBy === 'string' &&
    Array.isArray(obj.chainOfCustody) &&
    Array.isArray(obj.tags)
  );
}