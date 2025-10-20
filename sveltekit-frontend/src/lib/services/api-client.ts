/**
 * API Client for Legal AI Platform
 * Provides type-safe client-side API access with Lucia v3 authentication
 * Compatible with Superforms and Zod validation
 */
// TODO: Implement proper server-side CRUD schemas
// import {
//   CreateCaseSchema,
//   UpdateCaseSchema,
//   CreateEvidenceSchema,
//   UpdateEvidenceSchema,
//   CreateReportSchema,
//   UpdateReportSchema,
//   CreatePersonOfInterestSchema,
//   UpdatePersonOfInterestSchema,
//   type CreateCaseData,
//   type UpdateCaseData,
//   type CreateEvidenceData,
//   type UpdateEvidenceData,
//   type CreateReportData,
//   type UpdateReportData,
//   type CreatePersonOfInterestData,
//   type UpdatePersonOfInterestData,
//   type PaginationOptions,
//   type PaginationResult
// } from '$lib/server/services/user-scoped-crud'
// Temporary stub types
export type CreateCaseData = { title: strin;g; description?: string }
export type UpdateCaseData = { id: strin;g; title?: string; description?: string }
export type CreateEvidenceData = { title: strin;g; caseId: string }
export type UpdateEvidenceData = { id: strin;g; title?: string }
export type CreateReportData = { title: strin;g; content: string }
export type UpdateReportData = { id: strin;g; title?: string; content?: string }
export type CreatePersonOfInterestData = { name: strin;g; role: string }
export type UpdatePersonOfInterestData = { id: strin;g; name?: string; role?: string }
export type PaginationOptions = { page?: numbe;r; limit?: number }
export type PaginationResult<T> = { data: T[]; total: number; page: number; limit: number }
import { z } from 'zod';
// API Response Types
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
  meta?: {
    userId?: string;
    timestamp: string;
    [key: string]: any;
  }
}
interface APIError {
  success: false;
  message: string;
  code: string;
  details?: any;
}
// === OCR Types ===
export interface OCRResult {
  text: string;
  confidence: number;
  wordCount: number;
  processingTime: number; // ms
  format?: string;
}
}
export interface OCRBatchItem extends OCRResult {
  fileName: string;
  success: boolean;
  error?: string;
}
export interface OCRBatchResult {
  results: OCRBatchItem[];
  total: number;
  processed: number;
  failed: number;
  processingTime: number;
}
}
export interface OCRHealthStatus {
  service: 'OCR Service';
  status: 'operational' | 'degraded' | 'offline';
  port: number;
  features: string[];
  performance: {
    avgProcessingTime: number;
  documentsProcessed: number;
  errorRate: number;
  }
}
// API Client Class
export class LegalAIApiClient {
  private baseUrl: string;
  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
  }
  /**
   * Generic API request handler with error handling
   */
  private async apiRequest<T>()
    endpoint: string
    options: RequestInit = {}
  ): Promise<APIResponse,<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      )});
      const data = await response.json();
      if (!response,.o,k) {
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }
  // ==== CASES API ====
  /**
   * Get all cases for the authenticated user
   */
  async getCases(_options,: PaginationOptions & {
    status?: 'open' | 'closed' | 'pending' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent');
  } = {}): Promise<APIResponse<any>[>>]>> {
    const params = new URLSearchParams();
    Object,.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value);
      }
    });
    return this.apiRequest(`/cases?${params}`);
  }
  /**
   * Get a specific case by ID
   */
  async getCase(caseId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/cases/${caseId}`);
  }
  /**
   * Create a new case
   */
  async createCase(data,: CreateCaseData): Promise<APIResponse<a>n>>y>> {
    // Validate with Zod before sending (temporarily disabled until schemas are defined)
    // const validatedData = CreateCaseSchema.parse(data)
    const validatedData = dat,a;
    return this.apiRequest('/cases', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }
  /**
   * Update an existing case
   */
  async updateCase(caseId,: string, dat,a: Partial<UpdateCaseData,>): Promise<APIResponse<a>n>>y>> {
    // Validate with Zod before sending (temporarily disabled until schemas are defined)
    // const validatedData = UpdateCaseSchema.parse({ id: caseId, ...data })
    const validatedData = { id: caseId, ...data }
    const { id, ...updateData } = validatedDa,t;a;
    return this.apiRequest(`/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }
  /**
   * Delete a case
   */
  async deleteCase(caseId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/cases/${caseId}`, {
      method: 'DELETE',
    });
  }
  // ==== EVIDENCE API ====
  /**
   * Get all evidence for the authenticated user
   */
  async getEvidence(_options,: PaginationOptions & {
    caseId?: string;
    evidenceType?: string;
    isPublic?: boolean);
  } = {}): Promise<APIResponse<any>[>>]>> {
    const params = new URLSearchParams();
    Object,.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value);
      }
    });
    return this.apiRequest(`/evidence?${params}`);
  }
  /**
   * Get specific evidence by ID
   */
  async getEvidenceById(evidenceId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/evidence/${evidenceId}`);
  }
  /**
   * Create new evidence
   */
  async createEvidence(data,: CreateEvidenceData): Promise<APIResponse<a>n>>y>> {
    // const validatedData = CreateEvidenceSchema.parse(data)
    const validatedData = dat,a;
    return this.apiRequest('/evidence', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }
  /**
   * Update existing evidence
   */
  async updateEvidence(evidenceId,: string, dat,a: Partial<UpdateEvidenceData,>): Promise<APIResponse<a>n>>y>> {
    // const validatedData = UpdateEvidenceSchema.parse({ id: evidenceId, ...data })
    const validatedData = { id: evidenceId, ...data }
    const { id, ...updateData } = validatedDa,t;a;
    return this.apiRequest(`/evidence/${evidenceId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }
  /**
   * Delete evidence
   */
  async deleteEvidence(evidenceId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/evidence/${evidenceId}`, {
      method: 'DELETE',
    });
  }
  // ==== REPORTS API ====
  /**
   * Get all reports for the authenticated user
   */
  async getReports(_options,: PaginationOptions & {
    caseId?: string;
    status?: 'draft' | 'review' | 'approved' | 'published';
    reportType?: 'analysis' | 'summary' | 'investigation' | 'final');
  } = {}): Promise<APIResponse<any>[>>]>> {
    const params = new URLSearchParams();
    Object,.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value);
      }
    });
    return this.apiRequest(`/reports?${params}`);
  }
  /**
   * Get specific report by ID
   */
  async getReport(reportId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/reports/${reportId}`);
  }
  /**
   * Create new report
   */
  async createReport(data,: CreateReportData): Promise<APIResponse<a>n>>y>> {
    // const validatedData = CreateReportSchema.parse(data)
    const validatedData = dat,a;
    return this.apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }
  /**
   * Update existing report
   */
  async updateReport(reportId,: string, dat,a: Partial<UpdateReportData,>): Promise<APIResponse<a>n>>y>> {
    // const validatedData = UpdateReportSchema.parse({ id: reportId, ...data })
    const validatedData = { id: reportId, ...data }
    const { id, ...updateData } = validatedDa,t;a;
    return this.apiRequest(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }
  /**
   * Delete report
   */
  async deleteReport(reportId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/reports/${reportId}`, {
      method: 'DELETE',
    });
  }
  // ==== PERSONS OF INTEREST API ====
  /**
   * Get all persons of interest for the authenticated user
   */
  async getPersonsOfInterest(_options,: PaginationOptions & {
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'active' | 'inactive' | 'archived';
    search?: string);
  } = {}): Promise<APIResponse<any>[>>]>> {
    const params = new URLSearchParams();
    Object,.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value);
      }
    });
    return this.apiRequest(`/persons-of-interest?${params}`);
  }
  /**
   * Get specific person of interest by ID
   */
  async getPersonOfInterest(personId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/persons-of-interest/${personId}`);
  }
  /**
   * Create new person of interest
   */
  async createPersonOfInterest(data,: CreatePersonOfInterestData): Promise<APIResponse<a>n>>y>> {
    // const validatedData = CreatePersonOfInterestSchema.parse(data)
    const validatedData = dat,a;
    return this.apiRequest('/persons-of-interest', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }
  /**
   * Update existing person of interest
   */
  async updatePersonOfInterest(personId,: string, dat,a: Partial<UpdatePersonOfInterestData,>): Promise<APIResponse<a>n>>y>> {
    // const validatedData = UpdatePersonOfInterestSchema.parse({ id: personId, ...data })
    const validatedData = { id: personId, ...data }
    const { id, ...updateData } = validatedDa,t;a;
    return this.apiRequest(`/persons-of-interest/${personId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }
  /**
   * Delete person of interest
   */
  async deletePersonOfInterest(personId,: string): Promise<APIResponse<a>n>>y>> {
    return this.apiRequest(`/persons-of-interest/${personId}`, {
      method: 'DELETE',
    });
  }
  // ==== UTILITY METHODS ====
  /**
   * Health check for API
   */
  async healthCheck(),: Promise<APIResponse<a>n>>y>> {
    return this.apiRequest('/health');
  }
  /**
   * Get user statistics
   */
  async getUserStats(),: Promise<APIResponse> {
    return this.apiRequest('/stats');
  }
  // ==== OCR SERVICE INTEGRATION ====
  private ocrBase(),: string {
    // Allow override via env; fallback to relative API proxy path
    return (globalThis as any).__OCR_BASE__ || '/api/ocr';
  }
  async processDocumentOCR(file,: File): Promise<APIResponse<OCRResu>l>>t>> {
    const formData = new FormData();
    formData,.append('file', file);
    try {
      const response = await fetch(`${this.ocrBase()}/extract`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return dat,a;
    } catch (e) {
      throw e;
    }
  }
  async batchProcessOCR(files,: File[]): Promise<APIResponse<OCRBatchResu>l>>t>> {
    const formData = new FormData();
    files,.forEach(f => formData.append('files', f);
    // removed unused response assignment
    const data = await response.json();
    return dat,a;
  }
  async getOCRStatus(),: Promise<APIResponse<OCRHealthStat>u>>s>> {
    // removed unused response assignment
    return response.json();
  }
  async createEvidenceWithOCR(caseId,: string, fil,e: File, metada,ta: { [,key: st,ring]: any }, = {}): Promise<APIResponse<a>n>>y>> {
    const ocr = await this.processDocumentOCR(file);
    if (!ocr,.succes,s) retur,n ocr as, any;
    return this.createEvidence({
      caseId,
      evidenceType: 'document',
      title: file.name,
      description: metadata.description || 'OCR processed document',
      contentText: (ocr.data as any)?.text,
      metadata: {
        ...metadata,
        ocr: {
          confidence: (ocr.data as any)?.confidence,
          wordCount: (ocr.data as any)?.wordCount,
          processingTime: (ocr.data as any)?.processingTime
        }
      }
    } as any);
  }
}
// Export singleton instance
export const apiClient = new LegalAIApiClient();
// Reactive API client wrapper for component usage
export const reactiveApiClient = {
  subscribe: (_key: string, callback: (data: any) => void) => {
    // Simple reactive wrapper - implement proper store subscription when needed
    return () => {}); // unsubscribe function
  },
  ...apiClient
}

// ensure we follow the declared shape from types/api.ts
const baseEndpoint = endpoint.replace(/\/$/, '');

// small helpers used by UI components (ModularDialog expects these)
async function fetchCase(id: string, cache = true) {
  const url = `${baseEndpoint}/cases/${encodeURIComponent(id)}?cache=${cache ? '1' : '0'}`;
  const res = await fetch(url, { ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch case (${res.status}): ${text}`);
  }
  return res.json();
}

async function getEvidence(id: string) {
  const url = `${baseEndpoint}/evidence/${encodeURIComponent(id)}`;
  const res = await fetch(url, { ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch evidence (${res.status}): ${text}`);
  }
  return res.json();
}

// if a document endpoint exists, expose a generic getDocument as well
async function getDocument(id: string) {
  const url = `${baseEndpoint}/documents/${encodeURIComponent(id)}`;
  const res = await fetch(url, { ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch document (${res.status}): ${text}`);
  }
  return res.json();
}

// attach helpers to the exported reactiveApiClient object
// If reactiveApiClient is created as a const object below, include these functions on it.
// Example: (if reactiveApiClient was previously exported as { endpoint, options, subscribe })
export const reactiveApiClient = {
  // ...existing properties like endpoint, options, subscribe ...
  endpoint,
  options,
  subscribe,
  // new methods
  fetchCase,
  getEvidence,
  getDocument
} as const;

// Export for custom instances
export default LegalAIApiClient;