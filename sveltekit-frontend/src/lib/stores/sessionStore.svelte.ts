/**
 * Global Session Store - Lucia v3 Integration (Svelte 5 Runes)
 * Provides app-wide session management with persistent storage and fallback mechanisms
 */

import { page } from '$app/stores';
import { browser } from '$app/environment';

// Types based on Lucia v3 and app.d.ts
export interface User {
  id: string;
  email?: string;
  role: 'admin' | 'lead_prosecutor' | 'prosecutor' | 'paralegal' | 'investigator' | 'analyst' | 'viewer' | 'user';
}

export interface Session {
  id: string;
  user: User;
  fresh?: boolean;
  expiresAt?: Date;
}

export interface SessionState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastSyncAt: number;
}

// Create reactive session state using Svelte 5 runes
export const sessionState = $state<SessionState>({
  user: null,;
  session: null,
  isAuthenticated: false,
  isLoading: true,
  lastSyncAt: 0
});

// Derived stores for common use cases (as functions)
export const getUser = () => sessionState.user;
export const getIsAuthenticated = () => sessionState.isAuthenticated;
export const getIsLoading = () => sessionState.isLoading;
export const getCurrentUser = () => sessionState.user;

// Session management functions
export const sessionActions = {
  // Initialize session from page store or fallback mechanisms
  init(pageData?: any) {
    if (pageData?.user && pageData?.session) {
      // Primary: Use SvelteKit page data (most reliable)
      sessionState.user = pageData.user;
      sessionState.session = pageData.session;
      sessionState.isAuthenticated = !!pageData.user;
      sessionState.isLoading = false;
      sessionState.lastSyncAt = Date.now();
    } else {
      // Fallback: Try to restore from persistent storage
      restoreSessionFromStorage();
    }
  },

  // Update session state
  setSession(user: User | null, session: Session | null) {
    sessionState.user = user;
    sessionState.session = session;
    sessionState.isAuthenticated = !!user;
    sessionState.isLoading = false;
    sessionState.lastSyncAt = Date.now();

    // Persist to localStorage for faster subsequent loads
    if (browser && user) {
      try {
        localStorage.setItem('legal_ai_session_cache', JSON.stringify({
          user,
          session,
          cachedAt: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to cache session:', e);
      }
    }
  },

  // Clear session
  clearSession() {
    sessionState.user = null;
    sessionState.session = null;
    sessionState.isAuthenticated = false;
    sessionState.isLoading = false;
    sessionState.lastSyncAt = Date.now();

    // Clear persistent storage
    if (browser) {
      try {
        localStorage.removeItem('legal_ai_session_cache');
        // Clear any global session objects
        const win = window as any;
        delete win.__PERSISTED_SESSION;
        delete win.__SESSION;
        delete win.__LUCIA_SESSION;
      } catch (e) {
        console.warn('Failed to clear session cache:', e);
      }
    }
  },

  // Force refresh from server
  async refreshSession() {
    sessionState.isLoading = true;

    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data?.user) {
          sessionState.user = data.user;
          sessionState.session = data.session || { id: 'server', user: data.user };
          sessionState.isAuthenticated = true;
          sessionState.isLoading = false;
          sessionState.lastSyncAt = Date.now();
          return data.user;
        }
      }

      // No valid session found
      sessionState.user = null;
      sessionState.session = null;
      sessionState.isAuthenticated = false;
      sessionState.isLoading = false;
      sessionState.lastSyncAt = Date.now();
      return null;
    } catch (error) {
      console.error('Session refresh failed:', error);
      sessionState.isLoading = false;
      return null;
    }
  },

  // Get current user for upload operations
  getCurrentUser(): User | null {
    return sessionState.user;
  }
};

// Fallback session restoration from various storage mechanisms
function restoreSessionFromStorage() {
  if (!browser) return;

  try {
    // 1) Check localStorage cache first (fastest)
    const cached = localStorage.getItem('legal_ai_session_cache');
    if (cached) {
      const parsedCache = JSON.parse(cached);
      const cacheAge = Date.now() - (parsedCache.cachedAt || 0);

      // Use cache if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000 && parsedCache.user) {
        sessionActions.setSession(parsedCache.user, parsedCache.session);
        return;
      }
    }

    // 2) Check window globals (some apps expose session)
    const win = window as any;
    const candidate = win?.__PERSISTED_SESSION || win?.__SESSION || win?.__LUCIA_SESSION;
    if (candidate?.user?.id) {
      sessionActions.setSession(candidate.user, candidate.session || { id: 'global', user: candidate.user });
      return;
    }

    // 3) Check other localStorage keys
    const altSession = localStorage.getItem('session') || localStorage.getItem('auth');
    if (altSession) {
      const parsed = JSON.parse(altSession);
      if (parsed?.user?.id) {
        sessionActions.setSession(parsed.user, parsed.session);
        return;
      }
    }

    // 4) Last resort: Try server refresh
    sessionActions.refreshSession();

  } catch (error) {
    console.warn('Session restoration failed:', error);
    sessionActions.clearSession();
  }
}

// Utility functions for upload operations
export const getUserForUpload = (): { uploadedBy: string; uploaderRole: string; uploaderEmail: string | null } => {
  const currentUser = sessionActions.getCurrentUser();

  if (currentUser?.id) {
    return {
      uploadedBy: currentUser.id,
      uploaderRole: currentUser.role || 'viewer',
      uploaderEmail: currentUser.email || null
    };
  }

  // Try fallback mechanisms synchronously
  if (browser) {
    try {
      // Check window globals
      const win = window as any;
      const candidate = win?.__PERSISTED_SESSION || win?.__SESSION || win?.__LUCIA_SESSION;
      if (candidate?.user?.id) {
        return {
          uploadedBy: candidate.user.id,
          uploaderRole: candidate.user.role || 'viewer',
          uploaderEmail: candidate.user.email || null
        };
      }

      // Check localStorage
      const stored = localStorage.getItem('legal_ai_session_cache') ||
                    localStorage.getItem('session') ||
                    localStorage.getItem('auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.id) {
          return {
            uploadedBy: parsed.user.id,
            uploaderRole: parsed.user.role || 'viewer',
            uploaderEmail: parsed.user.email || null
          };
        }
      }
    } catch (e) {
      console.warn('Fallback session lookup failed:', e);
    }
  }

  // Return anonymous fallback
  return {
    uploadedBy: 'anonymous',
    uploaderRole: 'viewer',
    uploaderEmail: null
  };
};

// Legacy exports for backward compatibility
export const sessionStore = {
  subscribe: (fn: (value: SessionState) => void) => {
    // Create a reactive subscription that runs when sessionState changes
    $effect(() => {
      fn(sessionState);
    });
  },
  ...sessionActions
};