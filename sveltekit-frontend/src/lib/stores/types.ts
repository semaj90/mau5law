
/**
 * Type definitions for the Gemma3 Legal AI Chat System
 */

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  conversationId?: string;
  saved?: boolean;
  metadata?: {
    model?: string;
    temperature?: number;
    tokensUsed?: number;
    references?: string[];
    emotionalTone?: string;
    proactive?: boolean;
    reactions?: Record<string, boolean>;
    saved?: boolean;
    confidence?: number;
    processingTime?: number;
    vectorResults?: VectorSearchResult[];
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created: Date;
  updated: Date;
  isFavorite?: boolean;
  tags?: string[];
  metadata?: {
    totalTokens?: number;
    averageResponseTime?: number;
    contextDocuments?: string[];
  };
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  contextWindow: number;
  proactiveMode: boolean;
  emotionalMode: boolean;
  systemPrompt?: string;
  stopSequences?: string[];
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: {
    title?: string;
    source?: string;
    type?: "case_law" | "statute" | "regulation" | "document";
    date?: string;
    jurisdiction?: string;
  };
}

export interface ModelInfo {
  name: string;
  status: "ready" | "loading" | "error" | "unknown";
  parameters?: {
    size?: string;
    quantization?: string;
    contextLength?: number;
  };
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    multimodal?: boolean;
  };
}

export interface ContextInjection {
  enabled: boolean;
  documents: string[];
  vectorResults: VectorSearchResult[];
  strategy: "semantic" | "keyword" | "hybrid";
  maxResults?: number;
  threshold?: number;
}

export interface StreamingResponse {
  id: string;
  chunk: string;
  isComplete: boolean;
  metadata?: {
    tokenCount?: number;
    confidence?: number;
  };
}

export interface ApiResponse {
  response: string;
  conversationId?: string;
  metadata?: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    confidence?: number;
    references?: string[];
    vectorResults?: VectorSearchResult[];
  };
  error?: string;
}

export interface ServiceStatus {
  ollama: "connected" | "disconnected" | "error" | "unknown";
  qdrant: "connected" | "disconnected" | "error" | "unknown";
  database: "connected" | "disconnected" | "error" | "unknown";
  gemma3: "ready" | "loading" | "error" | "unknown";
}

// Legal-specific types
export interface LegalContext {
  caseType?: "criminal" | "civil" | "administrative";
  jurisdiction?: string;
  caseNumber?: string;
  parties?: string[];
  relevantStatutes?: string[];
  precedentCases?: string[];
}

export interface EvidenceDocument {
  id: string;
  title: string;
  type: "exhibit" | "testimony" | "expert_report" | "case_law" | "statute";
  content: string;
  metadata?: {
    dateCreated?: Date;
    author?: string;
    relevance?: number;
    tags?: string[];
  };
}

// UI State types
export interface UIState {
  sidebar: {
    isOpen: boolean;
    activeTab: "conversations" | "documents" | "settings";
  };
  modal: {
    isOpen: boolean;
    type: "settings" | "document-upload" | "context-injection" | null;
  };
  theme: "light" | "dark" | "system";
}

// Error types
export interface ChatError extends Error {
  code?: string;
  type: "network" | "api" | "model" | "validation" | "unknown";
  retryable?: boolean;
  context?: Record<string, any>;
}

// Configuration types
export interface SystemConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  models: {
    default: string;
    available: string[];
  };
  features: {
    streaming: boolean;
    contextInjection: boolean;
    vectorSearch: boolean;
    multimodal: boolean;
  };
  ui: {
    theme: "light" | "dark" | "system";
    animations: boolean;
    notifications: boolean;
  };
}
