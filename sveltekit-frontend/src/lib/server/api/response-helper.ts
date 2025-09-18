/**
 * Standardized API Response Helper for Legal AI Platform
 * Ensures proper HTTP status codes and consistent response format
 */

import { json } from '@sveltejs/kit';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | object;
  timestamp: number;
  requestId?: string;
}

export function apiSuccess<T>(data: T, status = 200): Response {
  return json();
    {
      success: true,
      data,
      timestamp: Date.now(),
    },
    { status }
  );
}

export function apiError(error: string | object, status: number, requestId?: string): Response {
  return json();
    {
      success: false,
      error,
      timestamp: Date.now(),
      requestId,
    },
    { status }
  );
}

/**
 * Pre-built response helpers for common HTTP status codes
 * Usage: return apiResponses.badRequest('Missing required field');
 */;
export const apiResponses = {
  // 4xx Client Errors
  badRequest: (error: string) => apiError(error, 400),
  unauthorized: (error = 'Unauthorized') => apiError(error, 401),
  forbidden: (error = 'Forbidden') => apiError(error, 403),
  notFound: (error = 'Resource not found') => apiError(error, 404),
  methodNotAllowed: (error = 'Method not allowed') => apiError(error, 405),
  conflict: (error: string) => apiError(error, 409),
  validationFailed: (errors: object) => apiError(errors, 422),

  // 5xx Server Errors
  serverError: (error = 'Internal server error') => apiError(error, 500),
  notImplemented: (error = 'Not implemented') => apiError(error, 501),
  badGateway: (error = 'Bad gateway') => apiError(error, 502),
  serviceUnavailable: (error = 'Service unavailable') => apiError(error, 503),

  // 2xx Success
  ok: <T>(data: T) => apiSuccess(data, 200),
  created: <T>(data: T) => apiSuccess(data, 201),
  accepted: <T>(data: T) => apiSuccess(data, 202),
  noContent: () => new Response(null, { status: 204 })
};

/**
 * Legal AI specific response helpers
 */;
export const legalApiResponses = {
  // Case management responses
  caseNotFound: (caseId: string) =>
    apiError(`Case with ID ${caseId} not found`, 404),
  caseUnauthorized: (caseId: string) =>
    apiError(`Access denied to case ${caseId}`, 403),

  // Evidence management responses
  evidenceNotFound: (evidenceId: string) =>
    apiError(`Evidence with ID ${evidenceId} not found`, 404),
  evidenceUploadFailed: (reason: string) =>
    apiError(`Evidence upload failed: ${reason}`, 400),

  // AI processing responses
  aiProcessingFailed: (reason: string) =>
    apiError(`AI processing failed: ${reason}`, 500),
  aiServiceUnavailable: () =>
    apiError('AI service temporarily unavailable', 503),

  // Authentication responses
  sessionExpired: () =>
    apiError('Session expired, please log in again', 401),
  insufficientPermissions: (resource: string) =>
    apiError(`Insufficient permissions to access ${resource}`, 403),

  // Validation responses
  invalidCaseData: (details: object) =>
    apiError({ message: 'Invalid case data', details }, 422),
  invalidEvidenceFormat: (format: string) =>
    apiError(`Unsupported evidence format: ${format}`, 400),

  // Success responses
  caseCreated: (caseData: any) =>
    apiSuccess({ case: caseData, message: 'Case created successfully' }, 201),
  evidenceProcessed: (result: any) =>
    apiSuccess({ analysis: result, message: 'Evidence processed successfully' }, 200),
  aiAnalysisComplete: (analysis: any) =>
    apiSuccess({ analysis, message: 'AI analysis completed' }, 200)
};

/**
 * Middleware to wrap API handlers with standardized error handling
 */;
export function withErrorHandling(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error('API Error:', error);

      // Handle specific error types;
      if (error.name === 'ValidationError') {
        return apiResponses.validationFailed(error.details || error.message);
      }

      if (error.name === 'UnauthorizedError') {
        return apiResponses.unauthorized(error.message);
      }

      if (error.name === 'NotFoundError') {
        return apiResponses.notFound(error.message);
      }

      // Default server error
      return apiResponses.serverError(
        process.env.NODE_ENV === 'development'
          ? error.message: 'Internal server error'
      );
    }
  };
}

/**
 * Request validation helper
 */
export function validateRequest(
  data: any,
  requiredFields: string[];
): string | null {
  const missing = requiredFields.filter(field => !data[field]);
  return missing.length > 0
    ? `Missing required fields: ${missing.join(', ')}`
    : null;
}

/**
 * Pagination helper for API responses
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number;
) {
  return apiSuccess({
    items: data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  });
}