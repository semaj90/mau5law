/**
 * Data Management Utilities
 * API integration, caching, validation, and state management helpers
 * Supporting global components and user session persistence
 */

import { browser } from '$app/environment';
import type { UserSession } from '$lib/stores/sessionStore';

// Cache management for performance
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 100;

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(keyPattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const dataCache = new DataCache();

// API request helpers with caching and error handling
export interface ApiOptions {
  cache?: boolean;
  cacheTtl?: number;
  retries?: number;
  timeout?: number;
  signal?: AbortSignal;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(
    endpoint: string,
    options?: RequestInit & ApiOptions
  ): Promise<{ data: T; success: boolean; error?: string }> {
    const {
      cache = false,
      cacheTtl = 5 * 60 * 1000,
      retries = 1,
      timeout = 10000,
      signal,
      ...fetchOptions
    } = options || {};

    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${fetchOptions.method || 'GET'}:${url}:${JSON.stringify(fetchOptions.body || {})}`;

    // Check cache first
    if (cache && !signal) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const finalSignal = signal || controller.signal;

        const response = await fetch(url, {
          ...fetchOptions,
          signal: finalSignal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Network error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Cache successful responses
        if (cache) {
          dataCache.set(cacheKey, data, cacheTtl);
        }

        return { data, success: true };

      } catch (error: any) {
        lastError = error;

        // Don't retry on abort
        if (error.name === 'AbortError') {
          break;
        }

        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    return {
      data: null as T,
      success: false,
      error: lastError?.message || 'Request failed'
    };
  }

  async get<T = any>(endpoint: string, options?: ApiOptions): Promise<{ data: T; success: boolean; error?: string }> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<{ data: T; success: boolean; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options
    });
  }

  async put<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<{ data: T; success: boolean; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options
    });
  }

  async delete<T = any>(endpoint: string, options?: ApiOptions): Promise<{ data: T; success: boolean; error?: string }> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

export const apiClient = new ApiClient();

// Data validation helpers
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateData(data: any, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      if (rules.minLength && String(value).length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
        continue;
      }

      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors[field] = `${field} must be no more than ${rules.maxLength} characters`;
        continue;
      }

      if (rules.pattern && !rules.pattern.test(String(value))) {
        errors[field] = `${field} format is invalid`;
        continue;
      }

      if (rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors[field] = typeof customResult === 'string' ? customResult : `${field} is invalid`;
          continue;
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Common validation schemas
export const validationSchemas = {
  case: {
    title: { required: true, minLength: 3, maxLength: 200 },
    description: { maxLength: 2000 },
    category: { required: true },
    priority: { required: true }
  },
  evidence: {
    title: { required: true, minLength: 3, maxLength: 200 },
    type: { required: true },
    caseId: { required: true }
  },
  report: {
    title: { required: true, minLength: 3, maxLength: 200 },
    type: { required: true },
    content: { required: true, minLength: 10 }
  },
  user: {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      custom: (value: string) => value.includes('@') || 'Invalid email format'
    },
    name: { minLength: 2, maxLength: 100 },
    role: { required: true }
  }
};

// Local storage helpers with error handling
export const storage = {
  get<T = any>(key: string, defaultValue?: T): T | null {
    if (!browser) return defaultValue || null;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.warn(`Failed to parse localStorage item "${key}":`, error);
      return defaultValue || null;
    }
  },

  set(key: string, value: any): boolean {
    if (!browser) return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to save to localStorage "${key}":`, error);
      return false;
    }
  },

  remove(key: string): boolean {
    if (!browser) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error);
      return false;
    }
  },

  clear(): boolean {
    if (!browser) return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }
};

// File handling utilities
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      const baseType = type.split('/')[0];
      return file.type.startsWith(baseType);
    }
    return file.type === type;
  });
}

export function formatFileType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'video/mp4': 'MP4 Video',
    'video/avi': 'AVI Video',
    'audio/mp3': 'MP3 Audio',
    'audio/wav': 'WAV Audio',
    'text/plain': 'Text File',
    'application/json': 'JSON File'
  };

  return typeMap[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
}

// Data transformation helpers
export function normalizeData<T>(data: any, schema: Record<string, any>): T {
  const normalized: any = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = data[key];

    if (value === undefined || value === null) {
      normalized[key] = null;
      continue;
    }

    switch (type) {
      case 'string':
        normalized[key] = String(value).trim();
        break;
      case 'number':
        normalized[key] = Number(value) || 0;
        break;
      case 'boolean':
        normalized[key] = Boolean(value);
        break;
      case 'date':
        normalized[key] = new Date(value);
        break;
      case 'array':
        normalized[key] = Array.isArray(value) ? value : [];
        break;
      default:
        normalized[key] = value;
    }
  }

  return normalized as T;
}

// Query parameter helpers
export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });

  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

export function parseQueryString(search: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const urlParams = new URLSearchParams(search);

  for (const [key, value] of urlParams.entries()) {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }

  return params;
}

// Error handling utilities
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export function createError(code: string, message: string, details?: any): AppError {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  };
}

export function handleApiError(error: any): AppError {
  if (error.name === 'AbortError') {
    return createError('REQUEST_CANCELLED', 'Request was cancelled');
  }

  if (error.message?.includes('fetch')) {
    return createError('NETWORK_ERROR', 'Network connection failed');
  }

  if (error.message?.includes('HTTP 401')) {
    return createError('UNAUTHORIZED', 'Authentication required');
  }

  if (error.message?.includes('HTTP 403')) {
    return createError('FORBIDDEN', 'Access denied');
  }

  if (error.message?.includes('HTTP 404')) {
    return createError('NOT_FOUND', 'Resource not found');
  }

  if (error.message?.includes('HTTP 500')) {
    return createError('SERVER_ERROR', 'Internal server error');
  }

  return createError('UNKNOWN_ERROR', error.message || 'An unexpected error occurred');
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  mark(name: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(performance.now());
  }

  measure(startMark: string, endMark: string): number | null {
    const starts = this.metrics.get(startMark);
    const ends = this.metrics.get(endMark);

    if (!starts?.length || !ends?.length) return null;

    return ends[ends.length - 1] - starts[starts.length - 1];
  }

  getAverageTime(name: string): number | null {
    const times = this.metrics.get(name);
    if (!times?.length || times.length < 2) return null;

    const durations = [];
    for (let i = 1; i < times.length; i += 2) {
      durations.push(times[i] - times[i - 1]);
    }

    return durations.reduce((sum, time) => sum + time, 0) / durations.length;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Data synchronization helpers
export class DataSync {
  private syncQueue = new Map<string, any>();
  private syncing = false;

  queue(key: string, data: any): void {
    this.syncQueue.set(key, { data, timestamp: Date.now() });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.syncing || this.syncQueue.size === 0) return;

    this.syncing = true;

    try {
      const entries = Array.from(this.syncQueue.entries());
      this.syncQueue.clear();

      await Promise.all(
        entries.map(async ([key, { data }]) => {
          try {
            await apiClient.post(`/sync/${key}`, data);
          } catch (error) {
            console.warn(`Failed to sync ${key}:`, error);
            // Re-queue failed items
            this.syncQueue.set(key, { data, timestamp: Date.now() });
          }
        })
      );
    } finally {
      this.syncing = false;

      // Process any items that were queued during sync
      if (this.syncQueue.size > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  getQueueSize(): number {
    return this.syncQueue.size;
  }

  clear(): void {
    this.syncQueue.clear();
  }
}

export const dataSync = new DataSync();