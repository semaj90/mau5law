/**
 * UI State Composables using Svelte 5 Runes
 * Reusable state management for common UI patterns
 */

// Modal/Dialog state management
export function useModal(initialOpen = false) {
  let isOpen = $state(initialOpen);
  let data = $state<any>(null);
  let onConfirm = $state<(() => void) | null>(null);
  let onCancel = $state<(() => void) | null>(null);

  function open(modalData?: any): void {
    data = modalData || null;
    isOpen = true;
  }

  function close(): void {
    isOpen = false;
    data = null;
    onConfirm = null;
    onCancel = null;
  }

  function confirm(): void {
    onConfirm?.();
    close();
  }

  function cancel(): void {
    onCancel?.();
    close();
  }

  function setCallbacks(confirmFn?: () => void, cancelFn?: () => void): void {
    onConfirm = confirmFn || null;
    onCancel = cancelFn || null;
  }

  return {
    isOpen: () => isOpen,
    data: () => data,
    open,
    close,
    confirm,
    cancel,
    setCallbacks
  };
}

// Toast/Notification state management
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

export function useToast() {
  let toasts = $state<Toast[]>([]);
  
  let activeToasts = $derived(toasts.filter(t => {
    const now = Date.now();
    const duration = t.duration || 5000;
    return now - t.createdAt < duration;
  }));

  function addToast(type: Toast['type'], title: string, message?: string, duration?: number): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration: duration || 5000,
      createdAt: Date.now()
    };

    toasts = [...toasts, toast];

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration);

    return id;
  }

  function removeToast(id: string): void {
    toasts = toasts.filter(t => t.id !== id);
  }

  function clearAll(): void {
    toasts = [];
  }

  // Convenience methods
  const success = (title: string, message?: string, duration?: number) => 
    addToast('success', title, message, duration);
  
  const error = (title: string, message?: string, duration?: number) => 
    addToast('error', title, message, duration);
  
  const warning = (title: string, message?: string, duration?: number) => 
    addToast('warning', title, message, duration);
  
  const info = (title: string, message?: string, duration?: number) => 
    addToast('info', title, message, duration);

  return {
    toasts: () => toasts,
    activeToasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  };
}

// Form state management
export function useForm<T extends Record<string, any>>(initialValues: T) {
  let values = $state<T>({ ...initialValues });
  let errors = $state<Partial<Record<keyof T, string>>>({});
  let touched = $state<Partial<Record<keyof T, boolean>>>({});
  let isSubmitting = $state(false);
  let isValid = $derived(Object.keys(errors).length === 0);
  let isDirty = $derived(
    Object.keys(values).some(key => values[key] !== initialValues[key])
  );

  function setValue<K extends keyof T>(field: K, value: T[K]): void {
    values[field] = value;
    touched[field] = true;
    
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      errors = newErrors;
    }
  }

  function setError(field: keyof T, message: string): void {
    errors = { ...errors, [field]: message };
  }

  function clearError(field: keyof T): void {
    const newErrors = { ...errors };
    delete newErrors[field];
    errors = newErrors;
  }

  function clearAllErrors(): void {
    errors = {};
  }

  function setTouched(field: keyof T, isTouched = true): void {
    touched = { ...touched, [field]: isTouched };
  }

  function reset(newValues?: Partial<T>): void {
    values = { ...initialValues, ...newValues };
    errors = {};
    touched = {};
    isSubmitting = false;
  }

  function validate(validators: Partial<Record<keyof T, (value: any) => string | null>>): boolean {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    Object.keys(validators).forEach(field => {
      const validator = validators[field as keyof T];
      if (validator) {
        const error = validator(values[field as keyof T]);
        if (error) {
          newErrors[field as keyof T] = error;
          hasErrors = true;
        }
      }
    });

    errors = newErrors;
    return !hasErrors;
  }

  async function submit<R>(submitFn: (values: T) => Promise<R>): Promise<R | null> {
    isSubmitting = true;
    
    try {
      const result = await submitFn(values);
      return result;
    } catch (error: any) {
      // Handle submission errors
      if (error.fieldErrors) {
        errors = { ...errors, ...error.fieldErrors };
      }
      throw error;
    } finally {
      isSubmitting = false;
    }
  }

  return {
    values: () => values,
    errors: () => errors,
    touched: () => touched,
    isSubmitting: () => isSubmitting,
    isValid,
    isDirty,
    setValue,
    setError,
    clearError,
    clearAllErrors,
    setTouched,
    reset,
    validate,
    submit
  };
}

// Loading state management
export function useAsync<T>(asyncFn: () => Promise<T>) {
  let data = $state<T | null>(null);
  let error = $state<Error | null>(null);
  let isLoading = $state(false);
  let lastExecuted = $state<number>(0);

  let hasData = $derived(data !== null);
  let hasError = $derived(error !== null);
  let isStale = $derived(() => {
    if (!lastExecuted) return true;
    return Date.now() - lastExecuted > 300000; // 5 minutes
  });

  async function execute(): Promise<T | null> {
    isLoading = true;
    error = null;

    try {
      const result = await asyncFn();
      data = result;
      lastExecuted = Date.now();
      return result;
    } catch (err: any) {
      error = err;
      data = null;
      return null;
    } finally {
      isLoading = false;
    }
  }

  function reset(): void {
    data = null;
    error = null;
    isLoading = false;
    lastExecuted = 0;
  }

  return {
    data: () => data,
    error: () => error,
    isLoading: () => isLoading,
    lastExecuted: () => lastExecuted,
    hasData,
    hasError,
    isStale,
    execute,
    reset
  };
}

// Sidebar/Navigation state management
export function useSidebar(initialOpen = true) {
  let isOpen = $state(initialOpen);
  let activeSection = $state<string | null>(null);
  let pinnedSections = $state<Set<string>>(new Set());

  let isPinned = $derived((section: string) => pinnedSections.has(section));

  function toggle(): void {
    isOpen = !isOpen;
  }

  function open(): void {
    isOpen = true;
  }

  function close(): void {
    isOpen = false;
  }

  function setActiveSection(section: string | null): void {
    activeSection = section;
  }

  function togglePin(section: string): void {
    const newPinned = new Set(pinnedSections);
    if (newPinned.has(section)) {
      newPinned.delete(section);
    } else {
      newPinned.add(section);
    }
    pinnedSections = newPinned;
  }

  return {
    isOpen: () => isOpen,
    activeSection: () => activeSection,
    pinnedSections: () => Array.from(pinnedSections),
    isPinned,
    toggle,
    open,
    close,
    setActiveSection,
    togglePin
  };
}

// Search state management
export function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  initialQuery = ''
) {
  let query = $state(initialQuery);
  let isSearching = $state(false);

  let filteredItems = $derived(() => {
    if (!query.trim()) return items;

    const searchTerm = query.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm);
        }
        if (Array.isArray(value)) {
          return value.some(v => 
            typeof v === 'string' && v.toLowerCase().includes(searchTerm)
          );
        }
        return false;
      })
    );
  });

  let hasResults = $derived(filteredItems.length > 0);
  let resultsCount = $derived(filteredItems.length);

  function setQuery(newQuery: string): void {
    query = newQuery;
  }

  function clearQuery(): void {
    query = '';
  }

  async function performAsyncSearch<R>(
    asyncSearchFn: (query: string) => Promise<R[]>
  ): Promise<R[]> {
    if (!query.trim()) return [];

    isSearching = true;
    try {
      const results = await asyncSearchFn(query);
      return results;
    } finally {
      isSearching = false;
    }
  }

  return {
    query: () => query,
    isSearching: () => isSearching,
    filteredItems,
    hasResults,
    resultsCount,
    setQuery,
    clearQuery,
    performAsyncSearch
  };
}

// Theme/Appearance state management
export function useTheme() {
  let theme = $state<'light' | 'dark' | 'auto'>('auto');
  let systemTheme = $state<'light' | 'dark'>('light');
  
  let effectiveTheme = $derived(() => {
    if (theme === 'auto') return systemTheme;
    return theme;
  });

  // Effect to detect system theme
  $effect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemTheme = mediaQuery.matches ? 'dark' : 'light';
      
      const handleChange = (e: MediaQueryListEvent) => {
        systemTheme = e.matches ? 'dark' : 'light';
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  });

  function setTheme(newTheme: 'light' | 'dark' | 'auto'): void {
    theme = newTheme;
    
    // Store in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  }

  // Load theme from localStorage on init
  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        theme = stored as 'light' | 'dark' | 'auto';
      }
    }
  });

  return {
    theme: () => theme,
    systemTheme: () => systemTheme,
    effectiveTheme,
    setTheme
  };
}