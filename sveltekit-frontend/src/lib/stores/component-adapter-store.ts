/**
 * Svelte 5 Component Adapter Logic Layer
 * Converts complex stateful components into simple "dumb" prop receivers
 * following the decoupled architecture pattern
 */

import { writable, derived, type Readable } from 'svelte/store';

// Simple interfaces for UI consumption
export interface ComponentState {
  loading: boolean;
  error: string | null;
  data: any;
  meta: Record<string, any>;
}

export interface UIProps {
  variant?: string;
  size?: string;
  disabled?: boolean;
  class?: string;
  style?: string;
  [key: string]: any;
}

export interface ComponentAdapter<TData = any> {
  state: Readable<ComponentState>;
  props: Readable<UIProps>;
  actions: {
    update: (data: Partial<TData>) => void;
    reset: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
  };
}

/**
 * Base Component Adapter Factory
 * Creates simplified adapters for complex components
 */
export function createComponentAdapter<TData = any>(
  initialData: TData,
  options: {
    loading?: boolean;
    error?: string | null;
    meta?: Record<string, any>;
  } = {}
): ComponentAdapter<TData> {
  
  const state = writable<ComponentState>({
    loading: options.loading ?? false,
    error: options.error ?? null,
    data: initialData,
    meta: options.meta ?? {}
  });

  const props = writable<UIProps>({
    variant: 'default',
    size: 'medium',
    disabled: false
  });

  return {
    state: { subscribe: state.subscribe },
    props: { subscribe: props.subscribe },
    actions: {
      update: (newData: Partial<TData>) => {
        state.update(current => ({
          ...current,
          data: { ...current.data, ...newData }
        }));
      },
      reset: () => {
        state.set({
          loading: false,
          error: null,
          data: initialData,
          meta: {}
        });
      },
      setLoading: (loading: boolean) => {
        state.update(current => ({ ...current, loading }));
      },
      setError: (error: string | null) => {
        state.update(current => ({ ...current, error }));
      }
    }
  };
}

/**
 * Chat Component Adapter
 * Simplifies complex chat component state
 */
export interface ChatData {
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }>;
  currentInput: string;
  isTyping: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export function createChatAdapter(initialMessages: ChatData['messages'] = []): ComponentAdapter<ChatData> {
  const adapter = createComponentAdapter<ChatData>({
    messages: initialMessages,
    currentInput: '',
    isTyping: false,
    connectionStatus: 'disconnected'
  });

  // Enhanced actions for chat-specific operations
  const chatActions = {
    ...adapter.actions,
    addMessage: (message: { role: 'user' | 'assistant'; content: string }) => {
      adapter.actions.update({
        messages: [
          ...adapter.state.subscribe(s => s.data.messages)[0]?.messages || [],
          { ...message, timestamp: Date.now() }
        ]
      });
    },
    setTyping: (isTyping: boolean) => {
      adapter.actions.update({ isTyping });
    },
    updateInput: (input: string) => {
      adapter.actions.update({ currentInput: input });
    },
    setConnectionStatus: (status: ChatData['connectionStatus']) => {
      adapter.actions.update({ connectionStatus: status });
    }
  };

  return {
    ...adapter,
    actions: chatActions
  };
}

/**
 * Search Component Adapter
 * Simplifies complex search component state
 */
export interface SearchData {
  query: string;
  results: any[];
  filters: Record<string, any>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function createSearchAdapter(): ComponentAdapter<SearchData> {
  const adapter = createComponentAdapter<SearchData>({
    query: '',
    results: [],
    filters: {},
    pagination: { page: 1, limit: 20, total: 0 },
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const searchActions = {
    ...adapter.actions,
    setQuery: (query: string) => {
      adapter.actions.update({ query });
    },
    setResults: (results: any[], total: number = results.length) => {
      adapter.actions.update({ 
        results,
        pagination: { ...adapter.state.subscribe(s => s.data.pagination)[0]?.pagination, total }
      });
    },
    updateFilters: (filters: Partial<SearchData['filters']>) => {
      const currentFilters = adapter.state.subscribe(s => s.data.filters)[0]?.filters || {};
      adapter.actions.update({ filters: { ...currentFilters, ...filters } });
    },
    setPage: (page: number) => {
      const currentPagination = adapter.state.subscribe(s => s.data.pagination)[0]?.pagination;
      adapter.actions.update({ 
        pagination: { ...currentPagination, page }
      });
    }
  };

  return {
    ...adapter,
    actions: searchActions
  };
}

/**
 * Upload Component Adapter
 * Simplifies complex file upload component state
 */
export interface UploadData {
  files: File[];
  uploadProgress: Record<string, number>;
  uploadStatus: Record<string, 'pending' | 'uploading' | 'completed' | 'error'>;
  maxFileSize: number;
  allowedTypes: string[];
  multiple: boolean;
}

export function createUploadAdapter(
  options: {
    maxFileSize?: number;
    allowedTypes?: string[];
    multiple?: boolean;
  } = {}
): ComponentAdapter<UploadData> {
  const adapter = createComponentAdapter<UploadData>({
    files: [],
    uploadProgress: {},
    uploadStatus: {},
    maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
    allowedTypes: options.allowedTypes || ['*'],
    multiple: options.multiple ?? true
  });

  const uploadActions = {
    ...adapter.actions,
    addFiles: (newFiles: File[]) => {
      const currentFiles = adapter.state.subscribe(s => s.data.files)[0]?.files || [];
      const currentProgress = adapter.state.subscribe(s => s.data.uploadProgress)[0]?.uploadProgress || {};
      const currentStatus = adapter.state.subscribe(s => s.data.uploadStatus)[0]?.uploadStatus || {};
      
      const updatedProgress = { ...currentProgress };
      const updatedStatus = { ...currentStatus };
      
      newFiles.forEach(file => {
        updatedProgress[file.name] = 0;
        updatedStatus[file.name] = 'pending';
      });
      
      adapter.actions.update({
        files: [...currentFiles, ...newFiles],
        uploadProgress: updatedProgress,
        uploadStatus: updatedStatus
      });
    },
    updateProgress: (fileName: string, progress: number) => {
      const currentProgress = adapter.state.subscribe(s => s.data.uploadProgress)[0]?.uploadProgress || {};
      adapter.actions.update({
        uploadProgress: { ...currentProgress, [fileName]: progress }
      });
    },
    updateStatus: (fileName: string, status: UploadData['uploadStatus'][string]) => {
      const currentStatus = adapter.state.subscribe(s => s.data.uploadStatus)[0]?.uploadStatus || {};
      adapter.actions.update({
        uploadStatus: { ...currentStatus, [fileName]: status }
      });
    },
    removeFile: (fileName: string) => {
      const current = adapter.state.subscribe(s => s.data)[0];
      if (!current) return;
      
      const updatedFiles = current.files.filter(f => f.name !== fileName);
      const updatedProgress = { ...current.uploadProgress };
      const updatedStatus = { ...current.uploadStatus };
      
      delete updatedProgress[fileName];
      delete updatedStatus[fileName];
      
      adapter.actions.update({
        files: updatedFiles,
        uploadProgress: updatedProgress,
        uploadStatus: updatedStatus
      });
    }
  };

  return {
    ...adapter,
    actions: uploadActions
  };
}

/**
 * Form Component Adapter
 * Simplifies complex form component state
 */
export interface FormData {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export function createFormAdapter(
  initialValues: Record<string, any> = {},
  validationRules: Record<string, (value: any) => string | null> = {}
): ComponentAdapter<FormData> {
  const adapter = createComponentAdapter<FormData>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true
  });

  const formActions = {
    ...adapter.actions,
    setValue: (field: string, value: any) => {
      const current = adapter.state.subscribe(s => s.data)[0];
      if (!current) return;
      
      const newValues = { ...current.values, [field]: value };
      const newTouched = { ...current.touched, [field]: true };
      
      // Validate field if rules exist
      const errors = { ...current.errors };
      if (validationRules[field]) {
        const error = validationRules[field](value);
        if (error) {
          errors[field] = error;
        } else {
          delete errors[field];
        }
      }
      
      adapter.actions.update({
        values: newValues,
        touched: newTouched,
        errors,
        isValid: Object.keys(errors).length === 0
      });
    },
    setError: (field: string, error: string) => {
      const current = adapter.state.subscribe(s => s.data)[0];
      if (!current) return;
      
      const newErrors = { ...current.errors, [field]: error };
      adapter.actions.update({
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      });
    },
    clearErrors: () => {
      adapter.actions.update({
        errors: {},
        isValid: true
      });
    },
    setSubmitting: (isSubmitting: boolean) => {
      adapter.actions.update({ isSubmitting });
    }
  };

  return {
    ...adapter,
    actions: formActions
  };
}

/**
 * Component Adapter Registry
 * Central registry for managing component adapters
 */
class ComponentAdapterRegistry {
  private adapters = new Map<string, ComponentAdapter>();

  register<T>(id: string, adapter: ComponentAdapter<T>): void {
    this.adapters.set(id, adapter);
  }

  get<T>(id: string): ComponentAdapter<T> | undefined {
    return this.adapters.get(id) as ComponentAdapter<T>;
  }

  unregister(id: string): void {
    this.adapters.delete(id);
  }

  clear(): void {
    this.adapters.clear();
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const componentRegistry = new ComponentAdapterRegistry();

/**
 * Utility functions for Svelte 5 component migration
 */
export const svelte5Utils = {
  // Safe prop access for Svelte 5 components
  safeProps: <T extends Record<string, any>>(props: T, defaults: Partial<T>): T => {
    return { ...defaults, ...props };
  },

  // Convert complex state to simple props
  stateToProps: (state: ComponentState): UIProps => {
    return {
      loading: state.loading,
      disabled: state.loading,
      error: !!state.error,
      'data-error': state.error,
      'aria-busy': state.loading,
      'aria-invalid': !!state.error
    };
  },

  // Event handler factory for simplified components
  createHandler: <T extends (...args: any[]) => void>(
    fn: T,
    options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
  ) => {
    return (event: Event, ...args: Parameters<T>) => {
      if (options.preventDefault) event.preventDefault();
      if (options.stopPropagation) event.stopPropagation();
      fn(...args);
    };
  }
};