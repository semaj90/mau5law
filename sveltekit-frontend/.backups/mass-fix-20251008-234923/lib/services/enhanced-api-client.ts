/**
 * Enhanced API Client for Legal AI Platform
 * TypeScript integration with Zod validation and Superforms compatibility
 */
import { z } from 'zod';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
// Base API configuration
const API_BASE_URL = '/api/v1';
// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: { [key: string]: any }
  message?: string;
  code?: string;
  details?: any;
}
export interface PaginatedResponse<T = any> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}
// Request options
export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  retry?: {
    attempts?: number;
  backoffMs?: number;
  }
}
// Error types
export class ApiError extends Error {
  constructor()
    public status: number
    public code: string;
    message: string
    public details?: any;
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
/**
 * Enhanced API Client with comprehensive error handling and type safety
 */;
export class LegalAIApiClient {
  private baseUrl: string;
  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }
  /**
   * Generic request method with retry logic and error handling
   */
  private async request<T>()
    endpoint: string;
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      query?: { [key: string]: any }
      headers?: Record<string, string>;
      signal?: AbortSignal;
      retry?: { attempts?: number; backoffMs?: number }
    } = {}
  ): Promise<T>, {
    const {
      method = 'GET',
      body,
      query,
      headers = {},
      signal,
      retry = { attempts: 3, backoffMs: 1000 }
    } = options;
    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`, browser ? window.location.origin: 'http://localhost:5173')
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value),;
        }
      });
    }
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal
    }
    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body);
    }
    let lastError: Error;
    const maxAttempts = retry.attempts || 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {>;
      try {
        // removed unused response assignment
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }),;
          // Handle authentication errors
          if (response.status === 401) {
            if (browser) {
              goto('/auth/login');
            }
            throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
          }
          throw new ApiError()
            response.status,
            errorData.code || 'API_ERROR',
            errorData.message || `HTTP ${response.status}`,
            errorData.details
          );
        }
        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          throw error;
        }
        // Exponential backoff
        const delay = retry.backoffMs! * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay),;
        console.warn(`API request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`, error);
      }
    }
    throw lastError!;
  }
  // ===== CASES API =====
  /**
   * List cases with pagination and filtering
   */;
  async getCases(_options: {
    page?: number;
    limit?: number;
    sortBy?: 'title' | 'created_at' | 'updated_at' | 'status' | 'priority';
    sortOrder?: 'asc' | 'desc';
    status?: 'open' | 'closed' | 'pending' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    signal?: AbortSignal,);
  } = {}): Promise<PaginatedResponse> {
    const, { signal, ...query } = optio,n,;s;
    return, this.request('/cases', { query, signal },);
  }
  /**
   * Get specific case by ID
   */;
  async getCase(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/cases/${id}`, { signal },);
  }
  /**
   * Create new case
   */;
  async createCase(caseData,: {
    title: string,;
    description?: string,;
    caseNumber?: string,;
    status?: 'open' | 'closed' | 'pending' | 'archived',;
    priority?: 'low' | 'medium' | 'high' | 'urgent',;
    category?: string,;
    metadata?: { [key,: strin,g]: any, });
  }, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request('/cases', {
      method: 'POST',
      body: caseData
      signal
    }),;
  }
  /**
   * Update case
   */
  async updateCase(id,: string, caseDat,a: Partial<{>,
    title,: strin,g;
    description: string;
    caseNumber: string;
    status: 'open' | 'closed' | 'pending' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    metadata: { [key,: string,]: any });
  }>, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/cases/${id}`, {
      method: 'PUT',
      body: caseData
      signal
    }),;
  }
  /**
   * Delete case
   */;
  async deleteCase(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/cases/${id}`, {
      method: 'DELETE',
      signal
    }),;
  }
  // ===== EVIDENCE API =====
  /**
   * List evidence with pagination and filtering
   */;
  async getEvidence(_options,: {
    page?: number,;
    limit?: number,;
    caseId?: string,;
    evidenceType?: string,;
    isPublic?: boolean,;
    signal?: AbortSignal,);
  } = {}): Promise<PaginatedResponse> {
    const, { signal, ...query } = optio,n,;s;
    return, this.request('/evidence', { query, signal },);
  }
  /**
   * Get specific evidence by ID
   */;
  async getEvidenceItem(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/evidence/${id}`, { signal },);
  }
  /**
   * Create new evidence
   */;
  async createEvidence(evidenceData,: {
    caseId: string,;
    title: string,;
    evidenceType: string,;
    description?: string,;
    fileUrl?: string,;
    fileName?: string,;
    fileSize?: number,;
    mimeType?: string,;
    hash?: string,;
    tags?: string[],;
    chainOfCustody?: any[],;
    aiSummary?: string,;
    summary?: string,;
    isAdmissible?: boolean,;
    confidentialityLevel?: string,);
  }, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request('/evidence', {
      method: 'POST',
      body: evidenceData
      signal
    }),;
  }
  /**
   * Update evidence
   */
  async updateEvidence(id,: string, evidenceDat,a: Partial<{>,
    title,: strin,g;
    evidenceType: string;
    description: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    hash: string;
    tags: string[];
    chainOfCustody: any[];
    aiSummary: string;
    summary: string;
    isAdmissible: boolean;
    confidentialityLevel: string);
  }>, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/evidence/${id}`, {
      method: 'PUT',
      body: evidenceData
      signal
    }),;
  }
  /**
   * Delete evidence
   */;
  async deleteEvidence(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/evidence/${id}`, {
      method: 'DELETE',
      signal
    }),;
  }
  // ===== REPORTS API =====
  /**
   * List reports with pagination and filtering
   */;
  async getReports(_options,: {
    page?: number,;
    limit?: number,;
    caseId?: string,;
    reportType?: string,;
    status?: string,;
    signal?: AbortSignal,);
  } = {}): Promise<PaginatedResponse> {
    const, { signal, ...query } = optio,n,;s;
    return, this.request('/reports', { query, signal },);
  }
  /**
   * Get specific report by ID
   */;
  async getReport(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/reports/${id}`, { signal },);
  }
  /**
   * Create new report
   */;
  async createReport(reportData,: {
    title: string,;
    description?: string,;
    reportType: string,;
    caseId?: string,;
    content?: string,;
    status?: string,;
    metadata?: { [key,: strin,g]: any, });
  }, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request('/reports', {
      method: 'POST',
      body: reportData
      signal
    }),;
  }
  /**
   * Update report
   */
  async updateReport(id,: string, reportDat,a: Partial<{>,
    title,: strin,g;
    description: string;
    reportType: string;
    caseId: string;
    content: string;
    status: string;
    metadata: { [key,: string,]: any });
  }>, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/reports/${id}`, {
      method: 'PUT',
      body: reportData
      signal
    }),;
  }
  /**
   * Delete report
   */;
  async deleteReport(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/reports/${id}`, {
      method: 'DELETE',
      signal
    }),;
  }
  // ===== PERSONS OF INTEREST API =====
  /**
   * List persons of interest with pagination and filtering
   */;
  async getPersonsOfInterest(_options,: {
    page?: number,;
    limit?: number,;
    riskLevel?: string,;
    caseId?: string,;
    signal?: AbortSignal,);
  } = {}): Promise<PaginatedResponse> {
    const, { signal, ...query } = optio,n,;s;
    return, this.request('/persons-of-interest', { query, signal },);
  }
  /**
   * Get specific person of interest by ID
   */;
  async getPersonOfInterest(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/persons-of-interest/${id}`, { signal },);
  }
  /**
   * Create new person of interest
   */;
  async createPersonOfInterest(personData,: {
    name: string,;
    description?: string,;
    riskLevel: string,;
    caseId?: string,;
    contactInfo?: { [key,: strin,g]: any }
    aliases?: string[],;
    metadata?: { [key,: strin,g]: any, });
  }, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request('/persons-of-interest', {
      method: 'POST',
      body: personData
      signal
    }),;
  }
  /**
   * Update person of interest
   */
  async updatePersonOfInterest(id,: string, personDat,a: Partial<{>,
    name,: strin,g;
    description: string;
    riskLevel: string;
    caseId: string;
    contactInfo: { [key,: string,]: any }
    aliases: string[];
    metadata: { [key,: string,]: any });
  }>, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/persons-of-interest/${id}`, {
      method: 'PUT',
      body: personData
      signal
    }),;
  }
  /**
   * Delete person of interest
   */;
  async deletePersonOfInterest(id,: string, signal?: AbortSignal,): Promise<ApiResponse> {
    return, this.request(`/persons-of-interest/${id}`, {
      method: 'DELETE',
      signal
    }),;
  }
  // ===== UTILITY METHODS =====
  /**
   * Upload file with progress tracking
   */
  async uploadFile()
    file: File
    onProgress?: (progress: number) => void,
    signal?: AbortSignal;
  ): Promise<{ fileUrl: string,; fileName: strin,g; fileSize: numb,er; mimeType: str,ing; hash: string }> {
    const, formData = new FormData(,);
    formData,.append('file', file,);
    return, new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload aborted'),;
        });
      }
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // removed unused response assignment
            resolve(response.data);
          } catch (error) {
            reject(new Error('Invalid response format'),;
          }
        } else {
          reject(new ApiError(xhr.status, 'UPLOAD_FAILED', 'File upload failed'),;
        }
      });
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'),;
      });
      xhr.open('POST', `${this.baseUrl}/files/upload`);
      xhr.send(formData);
    }),;
  }
  /**
   * Get health status of the API
   */;
  async getHealthStatus(signal?: AbortSignal),: Promise<{ status: strin,g; timestamp: stri,ng; services: Record<string>, a>>n>>y> }> {
    return, this.request('/health', { signal },);
  }
}
// Export singleton instance
export const apiClient = new LegalAIApiClient();
// Export Zod schemas for form validation
export const CreateCaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  caseNumber: z.string().max(100, 'Case number too long').optional(),
  status: z.enum(['open', 'closed', 'pending', 'archived']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
export const CreateEvidenceSchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  evidenceType: z.string().min(1, 'Evidence type is required'),
  description: z.string().optional(),
  fileUrl: z.string().url('Invalid file URL').optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative('File size must be non-negative').optional(),
  mimeType: z.string().optional(),
  hash: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  chainOfCustody: z.array(z.any()).optional().default([]),
  aiSummary: z.string().optional(),
  summary: z.string().optional(),
  isAdmissible: z.boolean().optional(),
  confidentialityLevel: z.string().optional()
});
export const CreateReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  reportType: z.string().min(1, 'Report type is required'),
  caseId: z.string().uuid('Invalid case ID').optional(),
  content: z.string().optional(),
  status: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
export const CreatePersonOfInterestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  riskLevel: z.string().min(1, 'Risk level is required'),
  caseId: z.string().uuid('Invalid case ID').optional(),
  contactInfo: z.record(z.any()).optional(),
  aliases: z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional()
});
// Type exports for forms
export type CreateCaseData = z.infer<typeof CreateCaseSchema,;>;
export type CreateEvidenceData = z.infer<typeof CreateEvidenceSchema,;>;
export type CreateReportData = z.infer<typeof CreateReportSchema,;>;
export type CreatePersonOfInterestData = z.infer<typeof CreatePersonOfInterestSchema,;>;