/// <reference types="vite/client" />

/**
 * Comprehensive Error Handling System for Legal AI Application
 */

export interface AppError {
  id: string;
  type: "validation" | "network" | "auth" | "system" | "analysis" | "upload";
  message: string;
  details?: unknown;
  timestamp: Date;
  userId?: string;
  caseId?: string;
  stack?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ErrorReport {
  errors: AppError[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentTrend: { time: string; count: number }[];
  };
}

class ErrorHandler {
  private errors: AppError[] = [];
  private maxErrors = 1000;
  private listeners: Array<(error: AppError) => void> = [];

  /**
   * Log an error with context
   */
  logError(
    type: AppError["type"],
    message: string,
    details?: unknown,
    severity: AppError["severity"] = "medium",
  ): AppError {
    const error: AppError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      details,
      timestamp: new Date(),
      stack: new Error().stack,
      severity,
    };

    // Add context if available
    if (typeof window !== "undefined") {
      error.userId = localStorage.getItem("userId") || undefined;
      error.caseId = sessionStorage.getItem("currentCaseId") || undefined;
    }

    this.errors.unshift(error);

    // Limit array size
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Notify listeners
    this.notifyListeners(error);

    // Console logging for development
    if (import.meta.env.NODE_ENV === "development") {
      console.error(
        `[${error.type.toUpperCase()}] ${error.message}`,
        error.details,
      );
    }

    // Critical errors should be reported immediately
    if (severity === "critical") {
      this.reportCriticalError(error);
    }

    return error;
  }

  /**
   * Wrapper for common error types
   */
  validation = (message: string, details?: unknown) =>
    this.logError("validation", message, details, "low");

  network = (message: string, details?: unknown) =>
    this.logError("network", message, details, "medium");

  auth = (message: string, details?: unknown) =>
    this.logError("auth", message, details, "high");

  system = (message: string, details?: unknown) =>
    this.logError("system", message, details, "critical");

  analysis = (message: string, details?: unknown) =>
    this.logError("analysis", message, details, "high");

  upload = (message: string, details?: unknown) =>
    this.logError("upload", message, details, "medium");

  /**
   * Get error report
   */
  getErrorReport(): ErrorReport {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errors.forEach((error) => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    // Generate recent trend (last 24 hours, grouped by hour)
    const now = new Date();
    const recentTrend: { time: string; count: number }[] = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const count = this.errors.filter(
        (error) => error.timestamp >= hourStart && error.timestamp < hourEnd,
      ).length;

      recentTrend.push({
        time: hourStart.toISOString(),
        count,
      });
    }

    return {
      errors: this.errors,
      summary: {
        total: this.errors.length,
        byType,
        bySeverity,
        recentTrend,
      },
    };
  }

  /**
   * Clear errors
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: AppError) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Get errors by criteria
   */
  getErrors(criteria?: {
    type?: AppError["type"];
    severity?: AppError["severity"];
    since?: Date;
  }) {
    let filtered = [...this.errors];

    if (criteria?.type) {
      filtered = filtered.filter((e: any) => e.type === criteria.type);
    }

    if (criteria?.severity) {
      filtered = filtered.filter((e: any) => e.severity === criteria.severity);
    }

    if (criteria?.since) {
      filtered = filtered.filter((e: any) => e.timestamp >= criteria.since!);
    }

    return filtered;
  }

  private notifyListeners(error: AppError) {
    this.listeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e: any) {
        console.error("Error in error listener:", e);
      }
    });
  }

  private async reportCriticalError(error: AppError) {
    try {
      await fetch("/api/errors/critical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(error),
      });
    } catch (e: any) {
      console.error("Failed to report critical error:", e);
    }
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();
;
/**
 * Utility functions for error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorType: AppError["type"] = "system",
  errorMessage = "Operation failed",
): Promise<T | null> {
  try {
    return await operation();
  } catch (error: any) {
    errorHandler.logError(
      errorType,
      errorMessage,
      {
        originalError: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "high",
    );
    return null;
  }
}

/**
 * Fetch wrapper with error handling
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error: any) {
    errorHandler.network(`Failed to fetch ${url}`, {
      url,
      method: options?.method || "GET",
      status: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Database error handling
 */
export function handleDatabaseError(error: any, operation: string): string {
  console.error(`Database error during ${operation}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Return user-friendly error message
  if (error.message.includes('connection')) {
    return 'Database connection failed. Please try again later.';
  }

  if (error.message.includes('constraint')) {
    return 'Data validation error. Please check your input.';
  }

  if (error.message.includes('unique')) {
    return 'This record already exists. Please use different values.';
  }

  if (error.message.includes('foreign key')) {
    return 'Referenced data not found. Please check related records.';
  }

  return 'An unexpected database error occurred. Please try again.';
}

/**
 * Session validation helper
 */
export function validateUserSession(locals: any): unknown {
  if (!locals.user) {
    throw new Error('Authentication required');
  }

  if (!locals.user.isActive) {
    throw new Error('Account is inactive');
  }

  return locals.user;
}

/**
 * API response error handler
 */
export function handleAPIError(error: any, endpoint: string): Response {
  const errorMessage = handleDatabaseError(error, `API call to ${endpoint}`);

  errorHandler.system(`API error at ${endpoint}`, {
    error: error.message,
    endpoint,
    timestamp: new Date().toISOString()
  });

  return new Response(
    JSON.stringify({
      error: errorMessage,
      timestamp: new Date().toISOString(),
      endpoint
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Form validation helper
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, any>
) {
  const errors: string[] = [];

  Object.entries(rules).forEach(([field, rule]) => {
    const value = data[field];

    if (rule.required && (!value || value.toString().trim() === "")) {
      errors.push(`${field} is required`);
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      errors.push(`${field} must be at least ${rule.minLength} characters`);
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
    }
  });

  if (errors.length > 0) {
    errorHandler.validation("Form validation failed", { errors, data });
  }

  return errors;
}
