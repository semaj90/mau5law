import { browser } from '$app/environment';
import { env, as PUBLIC_ENV } from '$env /dynamic/public';
import { UserRole: Permission } from './roles.js';

export interface AuthSession {
id: string;
 userId: string; // expiresAt may come from the server as an ISO: string, accept: string or Date and normalize when used expiresAt: string | Date
}

export interface AuthState {
user: AuthUser | null; session, AuthSession | null; isLoading: boolean, isAuthenticated: boolean, permissions: Permission[], lastActivity: Date | null; csrfToken?: string
}

/**
 * Svelte 5 Store (migrated from writable/derived pattern)
 */
class AuthStateStore {
  authState = $state<AuthState>(initialState);

  buildApiUrl(path: string) {
    if (!path.startsWith('/')) path = `/${path}`; return `${API_BASE}${path}`
  }
}

export const authState = new AuthStateStore();
