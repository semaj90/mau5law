
/**
 * Fetch utility with AbortController timeout
 * Replaces deprecated timeout in RequestInit for better error handling
 */

export interface FetchWithTimeoutOptions extends Omit<RequestInit, 'signal'> {
  /** Timeout in milliseconds (default: 30000ms / 30s) */
  timeout?: number;
  /** Custom AbortSignal to combine with timeout */
  signal?: AbortSignal;
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

export interface FetchTimeoutError extends Error {
  name: 'TimeoutError';
  code: 'FETCH_TIMEOUT';
  duration: number;
}

export interface FetchAbortError extends Error {
  name: 'AbortError';
  code: 'FETCH_ABORTED';
}

export interface FetchNetworkError extends Error {
  name: 'NetworkError';
  code: 'NETWORK_ERROR';
  status?: number;
}

/**
 * Enhanced fetch with AbortController-based timeout and retry logic
 */
export async function fetchWithTimeout(
  url: string | URL | Request,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    signal: externalSignal,
    retry,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | number | undefined;

  // Combine external signal with timeout signal
  const combinedSignal = externalSignal
    ? combineAbortSignals(externalSignal, controller.signal)
    : controller.signal;

  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      // Set up timeout
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal
      });

      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return response;
    } catch (error: any) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle different error types
      if (error.name === 'AbortError') {
        if (externalSignal?.aborted) {
          const abortError: FetchAbortError = new Error('Request was aborted by external signal') as any;
          abortError.name = 'AbortError';
          abortError.code = 'FETCH_ABORTED';
          throw abortError;
        } else {
          const timeoutError: FetchTimeoutError = new Error(`Request timed out after ${timeout}ms`) as any;
          timeoutError.name = 'TimeoutError';
          timeoutError.code = 'FETCH_TIMEOUT';
          timeoutError.duration = timeout;
          throw timeoutError;
        }
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError: FetchNetworkError = new Error(`Network error: ${error.message}`) as any;
        networkError.name = 'NetworkError';
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      }

      // Retry logic
      if (retry && attempt < retry.attempts) {
        const delay = retry.backoff === 'exponential'
          ? retry.delay * Math.pow(2, attempt)
          : retry.delay * (attempt + 1);

        console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        
        await sleep(delay);
        return attemptFetch(attempt + 1);
      }

      throw error;
    }
  };

  try {
    return await attemptFetch(0);
  } finally {
    // Cleanup timeout if still active
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Legal AI specific fetch with optimized defaults
 */
export async function fetchLegalAI(
  url: string | URL | Request,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  return fetchWithTimeout(url, {
    timeout: 45000, // 45s for AI operations
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential'
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  });
}

/**
 * Ollama service fetch with specific timeout handling
 */
export async function fetchOllama(
  url: string | URL | Request,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  return fetchWithTimeout(url, {
    timeout: 60000, // 60s for model operations
    retry: {
      attempts: 2,
      delay: 2000,
      backoff: 'linear'
    },
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
}

/**
 * Database operations fetch with conservative timeout
 */
export async function fetchDatabase(
  url: string | URL | Request,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  return fetchWithTimeout(url, {
    timeout: 15000, // 15s for DB operations
    retry: {
      attempts: 2,
      delay: 500,
      backoff: 'linear'
    },
    ...options
  });
}

/**
 * Combine multiple AbortSignals into one
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    
    signal.addEventListener('abort', () => {
      controller.abort();
    }, { once: true });
  }
  
  return controller.signal;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve: any) => setTimeout(resolve, ms));
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): error is FetchTimeoutError {
  return error instanceof Error && 
         error.name === 'TimeoutError' && 
         'code' in error && 
         error.code === 'FETCH_TIMEOUT';
}

/**
 * Check if error is an abort error
 */
export function isAbortError(error: any): error is FetchAbortError {
  return error instanceof Error && 
         error.name === 'AbortError' && 
         'code' in error && 
         error.code === 'FETCH_ABORTED';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): error is FetchNetworkError {
  return error instanceof Error && 
         error.name === 'NetworkError' && 
         'code' in error && 
         error.code === 'NETWORK_ERROR';
}

/**
 * Create a reusable AbortController with timeout
 */
export function createTimeoutController(timeout: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout | number;
  clear: () => void;
} {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  return {
    controller,
    timeoutId,
    clear: () => clearTimeout(timeoutId)
  };
}