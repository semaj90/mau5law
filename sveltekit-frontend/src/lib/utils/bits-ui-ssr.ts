/**
 * Client-side helpers for consuming SSR API data with Bits UI
 * Ensures proper data handling and reactivity
 */

import type { APIResponse } from '$lib/types/api-schemas';

/**
 * Fetches SSR-optimized API data for Bits UI components
 */
export async function fetchSSRData<T>(
  endpoint: string,
  options?: {
    params?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
  }
): Promise<APIResponse<T>> {
  const { params, method = 'GET', body } = options || {};

  const url = new URL(endpoint, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Reactive store wrapper for SSR data
 */
export function createSSRStore<T>(
  endpoint: string,
  initialData?: T,
  options?: {
    autoRefresh?: number; // ms
    params?: Record<string, string>;
  }
) {
  let data = $state<T | null>(initialData || null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const load = async () => {
    loading = true;
    error = null;

    try {
      const response = await fetchSSRData<T>(endpoint, {
        params: options?.params
      });

      if (response.success) {
        data = response.data;
      } else {
        error = response.error || 'Request failed';
      }
    } catch (err: any) {
      error = err.message || 'Unknown error';
      console.error('SSR Store Error:', err);
    } finally {
      loading = false;
    }
  };

  // Auto-refresh setup
  let refreshInterval: ReturnType<typeof setInterval> | undefined;
  if (options?.autoRefresh) {
    refreshInterval = setInterval(load, options.autoRefresh);
  }

  // Initial load if no initial data
  if (!initialData) {
    load();
  }

  return {
    get data() { return data; },
    get loading() { return loading; },
    get error() { return error; },
    load,
    refresh: load,
    destroy: () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    }
  };
}

/**
 * Form submission helper for Bits UI forms with SSR
 */
export async function submitForm<T>(
  endpoint: string,
  formData: Record<string, any>,
  options?: {
    method?: 'POST' | 'PUT' | 'PATCH';
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
): Promise<APIResponse<T>> {
  const { method = 'POST', onSuccess, onError } = options || {};

  try {
    const response = await fetchSSRData<T>(endpoint, {
      method,
      body: formData
    });

    if (response.success && onSuccess) {
      onSuccess(response.data);
    } else if (!response.success && onError) {
      onError(response.error || 'Form submission failed');
    }

    return response;
  } catch (err: any) {
    const errorMsg = err.message || 'Network error';
    if (onError) {
      onError(errorMsg);
    }
    throw err;
  }
}

/**
 * Batch data loader for complex Bits UI components
 */
export async function loadBatchData<T extends Record<string, any>>(
  endpoints: Record<keyof T, string>
): Promise<Record<keyof T, any>> {
  const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
    try {
      const response = await fetchSSRData(endpoint);
      return [key, response.success ? response.data : null];
    } catch {
      return [key, null];
    }
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

/**
 * Type-safe data validator for runtime checks
 */
export function validateSSRData<T>(
  data: any,
  validator: (data: any) => data is T
): T | null {
  return validator(data) ? data : null;
}

/**
 * Debounced search helper for Bits UI search components
 */
export function createDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  let currentQuery = $state('');
  let results = $state<T[]>([]);
  let searching = $state(false);

  const search = (query: string) => {
    currentQuery = query;

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      results = [];
      searching = false;
      return;
    }

    searching = true;
    searchTimeout = setTimeout(async () => {
      try {
        const searchResults = await searchFn(query);
        results = searchResults;
      } catch (error) {
        console.error('Search error:', error);
        results = [];
      } finally {
        searching = false;
      }
    }, delay);
  };

  return {
    get query() { return currentQuery; },
    get results() { return results; },
    get searching() { return searching; },
    search
  };
}

/**
 * SSR-aware error boundary for Bits UI components
 */
export function withSSRErrorBoundary<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: Error) => void
): Promise<T> {
  return fn().catch((error) => {
    console.error('SSR Error Boundary:', error);
    if (onError) {
      onError(error);
    }
    return fallback;
  });
}

/**
 * Optimistic updates for Bits UI forms
 */
export function createOptimisticStore<T>(initialData: T) {
  let data = $state<T>(initialData);
  let pending = $state(false);
  let error = $state<string | null>(null);

  const update = async (
    optimisticData: T,
    updateFn: () => Promise<T>
  ) => {
    const previousData = data;
    data = optimisticData;
    pending = true;
    error = null;

    try {
      const result = await updateFn();
      data = result;
    } catch (err: any) {
      // Revert to previous data on error
      data = previousData;
      error = err.message || 'Update failed';
      throw err;
    } finally {
      pending = false;
    }
  };

  return {
    get data() { return data; },
    get pending() { return pending; },
    get error() { return error; },
    update,
    set: (newData: T) => { data = newData; }
  };
}