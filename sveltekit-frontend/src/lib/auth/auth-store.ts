// Enhanced Authentication Store with Role-Based Access Control
// Manages user authentication state, permissions, and session management
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_API_BASE } from '$env/static/public'; // added
import type { User } from '../server/db/schema-postgres.js';
import { AccessControl, type UserRole, type Permission } from './roles.js';
export interface AuthUser extends Partial<User> {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  avatarUrl?: string;
  emailVerified?: boolean;
}
export interface AuthSession {
  id: string;
  userId: string;
  // expiresAt may come from the server as an ISO string; accept string or Date and normalize when used
  expiresAt: string | Date;
}
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: Permission[];
  lastActivity: Date | null;
  csrfToken?: string;
}

// Add a type for API responses to reduce repetition and improve readability
type ApiResponse = {
  success?: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  requiresMFA?: boolean;
  requiresVerification?: boolean;
};

// Initial auth state
const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  permissions: [],
  lastActivity: null,
};
// Create writable store for auth state
export const authState = writable<AuthState>(initialState);
// Create derived stores for common auth checks
export const isAuthenticated = derived(authState, $auth => $auth.isAuthenticated);
export const currentUser = derived(authState, $auth => $auth.user);
export const userRole = derived(authState, $auth => $auth.user?.role || 'viewer');
export const userPermissions = derived(authState, $auth => $auth.permissions);
export const isLoading = derived(authState, $auth => $auth.isLoading);
// Session management constants
const SESSION_CHECK_INTERVAL = 60000; // Check session every minute
const SESSION_WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before expiration
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
// Production-ready Docker Desktop endpoints (use host.docker.internal from containers)
export const DockerEndpoints = {
  POSTGRES: 'postgresql://legal_admin:123456@host.docker.internal:5434/legal_ai_db',
  REDIS: 'redis://:redis@host.docker.internal:6379/0',
  QDRANT: 'http://host.docker.internal:6333',
  OLLAMA: 'http://host.docker.internal:11434',
  CONTEXT7: 'http://host.docker.internal:8777',
  MINIO: 'http://host.docker.internal:9000',
};

// API base helper (uses PUBLIC_API_BASE if provided)
const API_BASE = (PUBLIC_API_BASE as string | undefined) || 'http://localhost:5173';
export function buildApiUrl(path: string) {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export class AuthStore {
  // Use number|null for browser setInterval/setTimeout handles (compatible with DOM)
  private static sessionCheckInterval: number | null = null;
  private static activityTimeout: number | null = null;
  // Helper to parse API responses without using `any`
  private static async parseApiResponse(response: Response): Promise<ApiResponse> {
    try {
      const raw = (await response.json()) as unknown;
      return raw as ApiResponse;
    } catch (err: unknown) {
      return {};
    }
  }
  /**
   * Initialize the auth store and start session management
   */
  static async initialize(): Promise<void> {
    if (!browser) return;
    authState.update(state => ({ ...state, isLoading: true }));
    try {
      // Check if there's an existing session
      await this.checkSession();
      // Start session monitoring
      this.startSessionMonitoring();
      // Setup activity tracking
      this.setupActivityTracking();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Auth initialization failed:', message);
      this.clearAuth();
    } finally {
      authState.update(state => ({ ...state, isLoading: false }));
    }
  }
  /**
   * Login with email and password
   */
  static async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string; requiresMFA?: boolean }> {
    authState.update(state => ({ ...state, isLoading: true }));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include',
      });
      const result = await this.parseApiResponse(response);
      if (response.ok && result.success) {
        // Update auth state with user data
        await this.updateAuthState(result.user!, result.session!);
        // Track login activity
        this.trackActivity('login');
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Login failed',
          requiresMFA: result.requiresMFA,
        };
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Login error:', msg);
      return { success: false, error: 'Network error during login' };
    } finally {
      authState.update(state => ({ ...state, isLoading: false }));
    }
  }
  /**
   * Register a new user account
   */
  static async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  }): Promise<{ success: boolean; requiresVerification?: boolean; error?: string }> {
    authState.update(state => ({ ...state, isLoading: true }));
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      const result = await this.parseApiResponse(response);
      if (response.ok && result.success) {
        // If auto-login after registration
        if (result.user && result.session) {
          await this.updateAuthState(result.user, result.session);
        }
        return { success: true, requiresVerification: result.requiresVerification };
      } else {
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Registration error:', msg);
      return { success: false, error: 'Network error during registration' };
    } finally {
      authState.update(state => ({ ...state, isLoading: false }));
    }
  }
  /**
   * Logout and clear session
   */
  static async logout(): Promise<void> {
    authState.update(state => ({ ...state, isLoading: true }));
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Logout error:', msg);
    } finally {
      this.clearAuth();
      this.stopSessionMonitoring();
      // Redirect to login page
      if (browser) {
        window.location.href = '/login';
      }
    }
  }
  /**
   * Check current session validity
   */
  static async checkSession(): Promise<boolean> {
    if (!browser) return false;
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const result = await this.parseApiResponse(response);
      if (response.ok && result.user && result.session) {
        await this.updateAuthState(result.user, result.session);
        return true;
      } else {
        this.clearAuth();
        return false;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Session check error:', msg);
      this.clearAuth();
      return false;
    }
  }
  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> {
    const currentState = get(authState);
    if (!currentState.isAuthenticated || !currentState.user) {
      return { success: false, error: 'Not authenticated' };
    }
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      const raw = (await response.json()) as unknown;
      const result = raw as { success?: boolean; user?: AuthUser; error?: string };
      if (response.ok && result.success) {
        // Update local user data
        authState.update(state => ({
          ...state,
          user: state.user ? { ...state.user, ...(result.user as AuthUser) } : null,
        }));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Profile update failed' };
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Profile update error:', msg);
      return { success: false, error: 'Network error during profile update' };
    }
  }
  /**
   * Change user password
   */
  static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string | undefined }> {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });
      const result = await this.parseApiResponse(response);
      return {
        success: response.ok && !!result.success,
        error: result.error,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Password change error:', msg);
      return { success: false, error: 'Network error during password change' };
    }
  }
  /**
   * Check if user has specific permission
   */
  static hasPermission(permission: Permission): boolean {
    const state = get(authState);
    return state.permissions.includes(permission);
  }
  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(permissions: Permission[]): boolean {
    const state = get(authState);
    return permissions.some(permission => state.permissions.includes(permission));
  }
  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(permissions: Permission[]): boolean {
    const state = get(authState);
    return permissions.every(permission => state.permissions.includes(permission));
  }
  /**
   * Check if user can access a resource
   */
  static canAccessResource(permission: Permission, resourceOwnerId?: string, isPublic = false): boolean {
    const state = get(authState);
    if (!state.user) return false;
    return AccessControl.canAccessResource(state.user.role, permission, resourceOwnerId, state.user.id, isPublic);
  }
  /**
   * Get user's role hierarchy level
   */
  static getRoleHierarchy(): number {
    const state = get(authState);
    if (!state.user) return 0;
    const role = state.user.role;
    return AccessControl.getRolePermissions(role).length;
  }
  /**
   * Private: Update auth state with user and session data
   */
  private static async updateAuthState(user: AuthUser, session: AuthSession): Promise<void> {
    // Get user permissions based on role
    const permissions = AccessControl.getRolePermissions(user.role);
    // Normalize session.expiresAt to a Date instance to make time math safe
    const normalizedSession: AuthSession = {
      ...session,
      expiresAt: session.expiresAt ? new Date(session.expiresAt) : new Date(),
    };

    authState.update(state => ({
      ...state,
      user,
      session: normalizedSession,
      isAuthenticated: true,
      permissions,
      lastActivity: new Date(),
      isLoading: false,
    }));
  }
  /**
   * Private: Clear authentication state
   */
  private static clearAuth(): void {
    authState.set({
      ...initialState,
      isLoading: false,
    });
  }
  /**
   * Private: Start session monitoring
   */
  private static startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    this.sessionCheckInterval = setInterval(async () => {
      const state = get(authState);
      // If not authenticated, attempt a lightweight session check and return
      if (!state.isAuthenticated || !state.session) {
        try {
          await this.checkSession();
        } catch (err) {
          // ignore - checkSession already handles clearing state on error
        }
        return;
      }

      // Ensure session.expiresAt is a timestamp
      const expiresAt = state.session && state.session.expiresAt ? new Date(state.session.expiresAt).getTime() : 0;
      const now = Date.now();
      const timeLeft = expiresAt - now;

      // If session expired, clear and redirect to login
      if (timeLeft <= 0) {
        console.warn('Session expired, clearing auth state.');
        this.clearAuth();
        return;
      }

      // If session is near expiry, attempt token refresh
      if (timeLeft < SESSION_WARNING_TIME) {
        try {
          const res = await fetch(buildApiUrl('/api/auth/refresh'), {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            const payload = await res.json();
            if (payload?.user && payload?.session) {
              await this.updateAuthState(payload.user, payload.session);
              await this.trackActivity('session_refresh');
              return;
            }
          }
          // If refresh fails, force logout
          console.warn('Session refresh failed, logging out.');
          await this.logout();
        } catch (err) {
          console.error('Error refreshing session:', err);
          await this.logout();
        }
      }
      // otherwise session healthy, no-op
    }, SESSION_CHECK_INTERVAL);
  }

  /**
   * Private: Stop session monitoring
   */
  private static stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Private: Setup simple activity tracking to keep sessions active
   */
  private static setupActivityTracking(): void {
    if (!browser) return;
    const resetLastActivity = () => {
      authState.update(s => ({ ...s, lastActivity: new Date() }));
    };
    const debouncedReset = () => {
      resetLastActivity();
      if (this.activityTimeout) clearTimeout(this.activityTimeout);
      this.activityTimeout = setTimeout(() => {
        // mark user inactive if no activity within ACTIVITY_TIMEOUT
        authState.update(s => ({ ...s, lastActivity: s.lastActivity ?? new Date() }));
      }, ACTIVITY_TIMEOUT);
    };
    // Listen to common user events
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, debouncedReset, { passive: true })
    );
    // initialize
    debouncedReset();
  }

  /**
   * Private: Track a named activity (best-effort notify server)
   */
  private static async trackActivity(name = 'interaction'): Promise<void> {
    authState.update(s => ({ ...s, lastActivity: new Date() }));
    try {
      await fetch(buildApiUrl('/api/auth/activity'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: name, timestamp: Date.now() }),
      });
    } catch {
      // ignore network errors for activity pings
    }
  }
}