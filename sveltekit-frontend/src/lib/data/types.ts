import {
  canvasStates,
  cases,
  criminals,
  evidence,
  reports,
  statutes,
  users
} from "../server/db/schema-postgres";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm/table";

// Core database types
export type Case = InferSelectModel<typeof cases>;
export type NewCase = InferInsertModel<typeof cases>;

export type Criminal = InferSelectModel<typeof criminals>;
export type NewCriminal = InferInsertModel<typeof criminals>;

export type Statute = InferSelectModel<typeof statutes>;
export type NewStatute = InferInsertModel<typeof statutes>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Extended User type with computed UI properties
export interface ExtendedUser extends User {
  // UI computed properties for backward compatibility
  username?: string; // alias for email or name
}

// Helper function to convert User to ExtendedUser
export function extendUser(user: User): ExtendedUser {
  return {
    ...user,
    username:
      user.name || user.email || `${user.firstName} ${user.lastName}`.trim()
  };
}

export type Evidence = InferSelectModel<typeof evidence>;
export type NewEvidence = InferInsertModel<typeof evidence>;

// Extended Evidence type with computed UI properties
export interface ExtendedEvidence extends Evidence {
  // UI computed properties for backward compatibility
  status?: string; // computed from isAdmissible and other fields
  type?: string; // alias for evidenceType
  createdAt?: string | Date; // alias for collectedAt or uploadedAt
}

// Helper function to convert Evidence to ExtendedEvidence
export function extendEvidence(evidence: Evidence): ExtendedEvidence {
  return {
    ...evidence,
    status: evidence.isAdmissible ? "approved" : "pending",
    type: evidence.evidenceType,
    createdAt: evidence.collectedAt || evidence.uploadedAt
  };
}

// Enhanced Report Builder types
export type Report = InferSelectModel<typeof reports>;
export type NewReport = InferInsertModel<typeof reports>;

// CitationPoints table not found in current schema - using manual interface
export interface CitationPoint {
  id: string;
  text: string;
  source: string;
  page?: number;
  context: string;
  tags: string[];
  caseId?: string;
  reportId?: string;
  type: "statute" | "case_law" | "evidence" | "expert_opinion" | "testimony";
  aiSummary?: string;
  relevanceScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCitationPoint {
  text: string;
  source: string;
  page?: number;
  context: string;
  tags?: string[];
  caseId?: string;
  reportId?: string;
  type: "statute" | "case_law" | "evidence" | "expert_opinion" | "testimony";
  aiSummary?: string;
  relevanceScore?: number;
}

export type CanvasState = InferSelectModel<typeof canvasStates>;
export type NewCanvasState = InferInsertModel<typeof canvasStates>;

// Type for the user object returned by Auth.js session
export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

// Extended Case type with Case Books functionality
export interface CaseWithBooks extends Case {
  reports?: Report[];
  books?: Book[];
  citationPoints?: CitationPoint[];
}

// Case Book interface - contains multiple reports and citations
export interface Book {
  id: string;
  title: string;
  description?: string;
  caseId: string;
  reports: Report[];
  citationPoints: CitationPoint[];
  metadata: {
    tags: string[];
    category: string;
    priority: "low" | "medium" | "high" | "critical";
    confidentialityLevel:
      | "public"
      | "restricted"
      | "confidential"
      | "top-secret";
    jurisdiction: string;
    createdDate: string;
    lastModified: string;
    completionStatus: "draft" | "review" | "final" | "archived";
  };
  aiSummary?: string;
  aiTags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Report Editor types
export interface ReportSection {
  id: string;
  title: string;
  content: string; // HTML content from contenteditable
  order: number;
  type: "text" | "evidence" | "citation" | "canvas";
  metadata?: {
    citations: string[]; // CitationPoint IDs
    evidenceRefs: string[]; // Evidence IDs
    canvasStateId?: string; // CanvasState ID if type is 'canvas'
  };
}

export interface ReportWithSections extends Report {
  sections: ReportSection[];
  citationPoints: CitationPoint[];
  canvasState?: CanvasState;
}

// AI Integration types
export interface AIAnalysis {
  id: string;
  reportId: string;
  analysisType:
    | "summary"
    | "keyword_extraction"
    | "sentiment"
    | "citation_suggestion"
    | "legal_precedent";
  result: {
    content: string;
    confidence: number;
    metadata: Record<string, any>;
  };
  timestamp: Date;
}

export interface CitationSuggestion {
  id: string;
  text: string;
  relevanceScore: number;
  source: CitationPoint;
  context: string;
  reasoning: string;
}

// Fabric.js Canvas types
export interface CanvasObject {
  id: string;
  type: "text" | "image" | "arrow" | "shape" | "highlight" | "evidence-marker";
  properties: Record<string, any>; // Fabric.js object properties
  metadata?: {
    evidenceId?: string;
    citationId?: string;
    annotations?: string[];
  };
}

export interface CanvasStateData {
  objects: CanvasObject[];
  background?: string;
  dimensions: {
    width: number;
    height: number;
  };
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  metadata: {
    title?: string;
    description?: string;
    tags: string[];
    evidenceIds: string[];
    citationIds: string[];
  };
}

// Search and filtering types
export interface SearchFilters {
  query?: string;
  caseId?: string;
  reportType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  jurisdiction?: string;
  confidentialityLevel?: string[];
  status?: string[];
}

export interface SearchResult {
  id: string;
  type: "report" | "citation" | "evidence" | "case";
  title: string;
  excerpt: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  highlights: string[];
}

// Export types
export interface ExportOptions {
  format: "pdf" | "docx" | "html" | "json";
  includeCanvases: boolean;
  includeCitations: boolean;
  includeMetadata: boolean;
  watermark?: string;
  headerFooter?: {
    header: string;
    footer: string;
  };
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  metadata: {
    fileSize: number;
    pageCount?: number;
    generatedAt: Date;
  };
}

// Legacy support for Loki.js (offline/local storage)
export interface LegacyCitationPoint {
  id: string;
  text: string;
  source: string;
  page?: number;
  context: string;
  tags: string[];
  caseId?: string;
  reportId?: string;
  type: "statute" | "case_law" | "evidence" | "expert_opinion" | "testimony";
  aiSummary?: string;
  relevanceScore?: number;
  createdAt: string; // ISO string for Loki.js compatibility
  updatedAt: string; // ISO string for Loki.js compatibility
}

// UI State types
export interface EditorState {
  activeReportId?: string;
  activeCanvasId?: string;
  selectedCitations: string[];
  clipboardContent?: {
    type: "text" | "citation" | "canvas-object";
    data: any;
  };
  autoSaveEnabled: boolean;
  lastSaved?: Date;
  isDirty: boolean;
}

export interface SidebarState {
  activeTab: "citations" | "evidence" | "ai-suggestions" | "canvas-tools";
  citationFilters: {
    type?: string;
    tags?: string[];
    searchQuery?: string;
  };
  collapsed: boolean;
}

// Real-time collaboration types (future feature)
export interface CollaborationState {
  activeUsers: {
    userId: string;
    userName: string;
    cursor?: {
      x: number;
      y: number;
    };
    selection?: {
      reportId: string;
      sectionId: string;
      range: {
        start: number;
        end: number;
      };
    };
  }[];
  changes: {
    id: string;
    userId: string;
    type: "text" | "canvas" | "citation";
    timestamp: Date;
    data: any;
  }[];
}

// AI-related types
export interface AIResponse {
  response: string;
  confidence?: number;
  contextUsed?: unknown[];
  suggestions?: string[];
  actions?: Array<{ type: string; text: string; data?: unknown }>;
  metadata?: {
    provider: "local" | "hybrid" | "cloud";
    model: string;
    confidence: number;
    executionTime: number;
    fromCache: boolean;
  };
}

// Gemma3 Configuration types
export interface Gemma3Config {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  systemPrompt: string;
}

// Local Model types
export interface LocalModel {
  name: string;
  path: string;
  format: string;
  size: string;
  available: boolean;
}

// API Response types
export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

// Conversation History for AI interactions
export interface ConversationHistory {
  id: string;
  sessionId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    provider?: string;
    model?: string;
    confidence?: number;
    contextUsed?: boolean;
  };
}
