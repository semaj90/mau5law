
/**
 * Error handling utilities for Svelte 5 components
 */

export class ComponentError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ComponentError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Safe fetch wrapper with error handling
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string; success: boolean }> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new ApiError(
        `HTTP error! status: ${response.status}`,
        response.status,
        url
      );
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message: 'Unknown error';
    console.error('API call failed:', error);
    return { error: errorMessage, success: false };
  }
}

// Safe JSON parsing
export function safeJsonParse<T = unknown>(
  json: string,
  fallback?: T
): { data?: T; error?: string; success: boolean } {
  try {
    const data = JSON.parse(json) as T;
    return { data, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message: 'JSON parsing failed';
    console.error('JSON parsing error:', error);
    return {
      data: fallback,
      error: errorMessage,
      success: false
    };
  }
}

// Error boundary hook for Svelte 5
export function createErrorBoundary() {
  let errorMessage = $state('');
  let hasError = $state(false);

  function captureError(error: Error, context?: string) {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    errorMessage = error.message;
    hasError = true;
  }

  function clearError() {
    errorMessage = '';
    hasError = false;
  }

  function withErrorBoundary<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch(error => {
            captureError(error, context);
            throw error;
          });
        }
        return result;
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), context);
        throw error;
      }
    }) as T;
  }

  return {
    get errorMessage() { return errorMessage; },
    get hasError() { return hasError; },
    captureError,
    clearError,
    withErrorBoundary
  };
}

// Validation helpers
export function validateRequired<T>(value: T, fieldName: string): T {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  return value;
}

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email', email);
  }
  return email;
}

export function validateType<T>(
  value: unknown,
  type: string,
  fieldName: string
): T {
  if (typeof value !== type) {
    throw new ValidationError(
      `${fieldName} must be of type ${type}`,
      fieldName,
      value
    );
  }
  return value as T;
}

// Canvas error handling
export function safeGetContext(
  canvas: HTMLCanvasElement,
  contextType: '2d' | 'webgl' | 'webgl2'
): CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext {
  const context = canvas.getContext(contextType);
  if (!context) {
    throw new ComponentError(
      `Could not get ${contextType} context`,
      'Canvas',
      { contextType }
    );
  }
  return context;
}

// WebGL error checking
export function checkWebGLError(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    let errorString: string;
    switch (error) {
      case gl.INVALID_ENUM: errorString = 'INVALID_ENUM';
        break;
      case gl.INVALID_VALUE: errorString = 'INVALID_VALUE';
        break;
      case gl.INVALID_OPERATION: errorString = 'INVALID_OPERATION';
        break;
      case gl.OUT_OF_MEMORY: errorString = 'OUT_OF_MEMORY';
        break;
      case gl.CONTEXT_LOST_WEBGL: errorString = 'CONTEXT_LOST_WEBGL';
        break;
      default:
        errorString = `Unknown error ${error}`;
    }
    throw new ComponentError(`WebGL error: ${errorString}`, 'WebGL');
  }
}

// Async operation wrapper
export async function withLoading<T>(
  operation: () => Promise<T>,
  loadingState: { value: boolean }
): Promise<T> {
  loadingState.value = true;
  try {
    return await operation();
  } finally {
    loadingState.value = false;
  }
}

// Retry mechanism
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i === maxRetries) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
}
