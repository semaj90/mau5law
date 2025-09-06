import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { User } from '$lib/database/schema';
import { EventEmitter } from "events";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: any | null;
  lastActivity: Date | null;
  securitySettings: {
    sessionTimeoutMinutes: number;
    requireReauth: boolean;
    enable2FA: boolean;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

class EnhancedAuthStore {
  // Svelte 5 reactive state
  private _state = browser ? $state<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    session: null,
    lastActivity: null,
    securitySettings: {
      sessionTimeoutMinutes: 30,
      requireReauth: false,
      enable2FA: false
    }
  }) : {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    session: null,
    lastActivity: null,
    securitySettings: {
      sessionTimeoutMinutes: 30,
      requireReauth: false,
      enable2FA: false
    }
  };

  private _error = browser ? $state<string | null>(null) : null;
  private _sessionCheckInterval: NodeJS.Timeout | null = null;
  private _activityTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (browser) {
      this.initializeAuth();
      this.setupActivityTracking();
      this.startSessionCheck();
    }
  }

  // Public getters (reactive)
  get state() {
    return this._state;
  }

  get error() {
    return this._error;
  }

  get user() {
    return this._state.user;
  }

  get isAuthenticated() {
    return this._state.isAuthenticated;
  }

  get isLoading() {
    return this._state.isLoading;
  }

  // Derived state
  get userRole() {
    return this._state.user?.role || 'guest';
  }

  get userInitials() {
    if (!this._state.user) return 'GU';
    const { firstName, lastName } = this._state.user;
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  get isAdmin() {
    return this._state.user?.role === 'admin';
  }

  get isProsecutor() {
    return this._state.user?.role === 'prosecutor';
  }

  get isDetective() {
    return this._state.user?.role === 'detective';
  }

  get sessionTimeRemaining() {
    if (!this._state.lastActivity || !this._state.securitySettings.sessionTimeoutMinutes) {
      return null;
    }

    const elapsed = Date.now() - this._state.lastActivity.getTime();
    const timeout = this._state.securitySettings.sessionTimeoutMinutes * 60 * 1000;
    const remaining = timeout - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    this._state.isLoading = true;
    this._error = null;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          ipAddress: await this.getClientIP(),
          userAgent: navigator.userAgent
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this._state.user = result.user;
        this._state.session = result.session;
        this._state.isAuthenticated = true;
        this._state.lastActivity = new Date();
        
        // Store session info
        if (credentials.rememberMe) {
          localStorage.setItem('auth:rememberMe', 'true');
        }
        
        this.trackActivity();
        return { success: true };
      } else {
        this._error = result.error || 'Login failed';
        return { success: false, error: this._error };
      }
    } catch (error: any) {
      this._error = 'Network error. Please try again.';
      console.error('Login error:', error);
      return { success: false, error: this._error };
    } finally {
      this._state.isLoading = false;
    }
  }

  async register(data: RegisterData): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> {
    this._state.isLoading = true;
    this._error = null;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          ipAddress: await this.getClientIP(),
          userAgent: navigator.userAgent
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.requiresVerification) {
          return { success: true, requiresVerification: true };
        }
        
        // Auto-login after registration
        this._state.user = result.user;
        this._state.session = result.session;
        this._state.isAuthenticated = true;
        this._state.lastActivity = new Date();
        
        this.trackActivity();
        return { success: true };
      } else {
        this._error = result.error || 'Registration failed';
        return { success: false, error: this._error };
      }
    } catch (error: any) {
      this._error = 'Network error. Please try again.';
      console.error('Registration error:', error);
      return { success: false, error: this._error };
    } finally {
      this._state.isLoading = false;
    }
  }

  async logout(): Promise<void> {
    this._state.isLoading = true;

    try {
      if (this._state.session?.id) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: this._state.session.id
          })
        });
      }
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
      await goto('/');
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      
      if (result.success) {
        this._state.user = result.user;
        this._state.isAuthenticated = true;
        this._state.lastActivity = new Date();
      }

      return result;
    } catch (error: any) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      return await response.json();
    } catch (error: any) {
      console.error('Password reset request error:', error);
      return { success: false, error: 'Request failed' };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword })
      });

      const result = await response.json();
      
      if (result.success) {
        // Clear any existing session and redirect to login
        this.clearAuthState();
      }

      return result;
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Reset failed' };
    }
  }

  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    if (!this._state.isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      
      if (result.success) {
        this._state.user = { ...this._state.user!, ...result.user };
      }

      return result;
    } catch (error: any) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Update failed' };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!this._state.isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      return await response.json();
    } catch (error: any) {
      console.error('Password change error:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  // Security and session management
  async refreshSession(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.user) {
          this._state.user = result.user;
          this._state.session = result.session;
          this._state.isAuthenticated = true;
          this._state.lastActivity = new Date();
          return true;
        }
      }
      
      this.clearAuthState();
      return false;
    } catch (error: any) {
      console.error('Session refresh error:', error);
      this.clearAuthState();
      return false;
    }
  }

  trackActivity(): void {
    this._state.lastActivity = new Date();
    
    // Reset activity timeout
    if (this._activityTimeout) {
      clearTimeout(this._activityTimeout);
    }
    
    const timeoutMs = this._state.securitySettings.sessionTimeoutMinutes * 60 * 1000;
    this._activityTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, timeoutMs);
  }

  async getSecuritySummary(): Promise<any> {
    if (!this._state.isAuthenticated) return null;

    try {
      const response = await fetch('/api/auth/security-summary');
      if (response.ok) {
        return await response.json();
      }
    } catch (error: any) {
      console.error('Security summary error:', error);
    }
    return null;
  }

  clearError(): void {
    this._error = null;
  }

  // Permission helpers
  hasPermission(permission: string): boolean {
    if (!this._state.user) return false;
    
    const rolePermissions = {
      admin: ['*'],
      prosecutor: ['case:read', 'case:write', 'evidence:read', 'evidence:write', 'document:read', 'document:write'],
      detective: ['case:read', 'evidence:read', 'evidence:write', 'document:read'],
      user: ['case:read', 'document:read']
    };

    const userPermissions = rolePermissions[this._state.user.role as keyof typeof rolePermissions] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  canAccessCase(caseId: string): boolean {
    // TODO: Implement case-specific access control
    return this.hasPermission('case:read');
  }

  // Private methods
  private async initializeAuth(): Promise<void> {
    try {
      this._state.isLoading = true;
      const isValid = await this.refreshSession();
      
      if (!isValid) {
        this.clearAuthState();
      }
    } catch (error: any) {
      console.error('Auth initialization error:', error);
      this.clearAuthState();
    } finally {
      this._state.isLoading = false;
    }
  }

  private setupActivityTracking(): void {
    if (!browser) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      if (this._state.isAuthenticated) {
        this.trackActivity();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });
  }

  private startSessionCheck(): void {
    if (this._sessionCheckInterval) {
      clearInterval(this._sessionCheckInterval);
    }

    this._sessionCheckInterval = setInterval(async () => {
      if (this._state.isAuthenticated) {
        const isValid = await this.refreshSession();
        if (!isValid) {
          this.handleSessionTimeout();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private handleSessionTimeout(): void {
    this.clearAuthState();
    this._error = 'Your session has expired. Please log in again.';
    goto('/login?reason=session-expired');
  }

  private clearAuthState(): void {
    this._state.user = null;
    this._state.session = null;
    this._state.isAuthenticated = false;
    this._state.lastActivity = null;
    this._state.isLoading = false;
    
    // Clear stored data
    localStorage.removeItem('auth:rememberMe');
    
    // Clear timeouts
    if (this._activityTimeout) {
      clearTimeout(this._activityTimeout);
      this._activityTimeout = null;
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('/api/client-ip');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

// Create singleton instance
export const enhancedAuthStore = new EnhancedAuthStore();