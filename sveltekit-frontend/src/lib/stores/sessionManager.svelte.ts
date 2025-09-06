// Session Management Store with XState Integration
// Bridges authentication and session management using Svelte 5 runes
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { createActor } from 'xstate';
import { sessionMachine, sessionServices, sessionActions } from '$lib/machines/sessionMachine.js';
import { authService, type User } from './auth.svelte';

// Session state interface
export interface SessionState {
  isActive: boolean;
  user: User | null;
  sessionId: string | null;
  expiresAt: Date | null;
  securityLevel: 'standard' | 'elevated' | 'secure';
  permissions: string[];
  lastActivity: Date | null;
  health: {
    isValid: boolean;
    warningCount: number;
    lastCheck: Date | null;
  };
  analytics: {
    loginTime: Date | null;
    activityCount: number;
    featuresUsed: string[];
  };
}

// Create reactive session state using $state rune
const sessionState = $state<SessionState>({
  isActive: false,
  user: null,
  sessionId: null,
  expiresAt: null,
  securityLevel: 'standard',
  permissions: [],
  lastActivity: null,
  health: {
    isValid: false,
    warningCount: 0,
    lastCheck: null
  },
  analytics: {
    loginTime: null,
    activityCount: 0,
    featuresUsed: []
  }
});

// Create XState actor for session management
const sessionActor = createActor(sessionMachine);

export class SessionManager {
  private actor = sessionActor;
  private activityTimer: number | null = null;

  constructor() {
    if (browser) {
      this.initialize();
    }
  }

  // Get current session state (reactive)
  get state() {
    return sessionState;
  }

  // Initialize session manager
  private initialize() {
    // Start the XState actor
    this.actor.start();

    // Subscribe to state changes
    this.actor.subscribe((state) => {
      this.updateSessionState(state);
    });

    // Set up activity tracking
    this.setupActivityTracking();

    // Check for existing session
    this.checkExistingSession();
  }

  // Update reactive session state from XState
  private updateSessionState(machineState: any) {
    const { context } = machineState;

    sessionState.isActive = machineState.matches('authenticated');
    sessionState.user = context.user;
    sessionState.sessionId = context.sessionId;
    sessionState.expiresAt = context.expiresAt;
    sessionState.securityLevel = context.securityLevel;
    sessionState.permissions = context.permissions;
    sessionState.lastActivity = context.lastActivity;
    sessionState.health = context.sessionHealth;
    sessionState.analytics = context.analyticsData;
  }

  // Start session with authenticated user
  async startSession(user: User, sessionId: string) {
    try {
      this.actor.send({
        type: 'AUTHENTICATE',
        user,
        sessionId
      });

      // Start periodic health checks
      this.startHealthChecks();

      console.log('Session started successfully for user:', user.email);
    } catch (error: any) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  // End current session
  async endSession() {
    try {
      this.actor.send({ type: 'LOGOUT' });
      this.stopHealthChecks();
      this.stopActivityTracking();

      console.log('Session ended successfully');
    } catch (error: any) {
      console.error('Failed to end session:', error);
    }
  }

  // Refresh session to extend expiration
  async refreshSession() {
    if (!sessionState.isActive) {
      throw new Error('No active session to refresh');
    }

    try {
      this.actor.send({ type: 'REFRESH_SESSION' });
      console.log('Session refreshed successfully');
    } catch (error: any) {
      console.error('Failed to refresh session:', error);
      throw error;
    }
  }

  // Extend session for longer duration
  async extendSession() {
    if (!sessionState.isActive) {
      throw new Error('No active session to extend');
    }

    try {
      this.actor.send({ type: 'EXTEND_SESSION' });
      console.log('Session extended successfully');
    } catch (error: any) {
      console.error('Failed to extend session:', error);
      throw error;
    }
  }

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    if (!sessionState.isActive || !sessionState.permissions) {
      return false;
    }

    return sessionState.permissions.includes('all') ||
           sessionState.permissions.includes(permission);
  }

  // Require specific permission (throws if not authorized)
  requirePermission(permission: string) {
    if (!this.hasPermission(permission)) {
      this.actor.send({ type: 'PERMISSION_CHECK', permission });
      throw new Error(`Permission required: ${permission}`);
    }
  }

  // Elevate security level for sensitive operations
  async elevateSecurityLevel(reason: string) {
    try {
      this.actor.send({ type: 'ELEVATE_SECURITY', reason });
      console.log('Security level elevated:', reason);
    } catch (error: any) {
      console.error('Failed to elevate security:', error);
      throw error;
    }
  }

  // Record user activity for analytics
  recordActivity(route: string, action: string, featureUsed?: string) {
    this.actor.send({
      type: 'ACTIVITY',
      route,
      action
    });

    // Track feature usage
    if (featureUsed && !sessionState.analytics.featuresUsed.includes(featureUsed)) {
      sessionState.analytics.featuresUsed.push(featureUsed);
    }
  }

  // Perform manual security check
  async performSecurityCheck() {
    try {
      this.actor.send({ type: 'SECURITY_CHECK' });
      console.log('Security check initiated');
    } catch (error: any) {
      console.error('Security check failed:', error);
    }
  }

  // Get session analytics data
  getAnalytics() {
    return {
      ...sessionState.analytics,
      sessionDuration: sessionState.analytics.loginTime ?
        Date.now() - sessionState.analytics.loginTime.getTime() : 0,
      isHealthy: sessionState.health.isValid,
      warningCount: sessionState.health.warningCount
    };
  }

  // Check for existing session on initialization
  private async checkExistingSession() {
    try {
      // Check if auth service has an active session
      if (authService.state.isAuthenticated && authService.state.user) {
        const sessionId = this.generateSessionId();
        await this.startSession(authService.state.user, sessionId);
      }
    } catch (error: any) {
      console.error('Failed to restore existing session:', error);
    }
  }

  // Set up activity tracking
  private setupActivityTracking() {
    if (!browser) return;

    // Track page navigation
    const trackNavigation = () => {
      this.recordActivity(window.location.pathname, 'navigation');
    };

    // Track user interactions
    const trackInteraction = (event: Event) => {
      const target = event.target as HTMLElement;
      const action = `${event.type}:${target.tagName.toLowerCase()}`;
      this.recordActivity(window.location.pathname, action);
    };

    // Set up event listeners
    window.addEventListener('popstate', trackNavigation);
    document.addEventListener('click', trackInteraction);
    document.addEventListener('keydown', trackInteraction);

    // Track activity every 30 seconds
    this.activityTimer = window.setInterval(() => {
      if (sessionState.isActive) {
        this.recordActivity(window.location.pathname, 'periodic_check');
      }
    }, 30000);
  }

  // Stop activity tracking
  private stopActivityTracking() {
    if (this.activityTimer) {
      window.clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  // Start periodic health checks
  private startHealthChecks() {
    // Health check every 5 minutes
    setInterval(() => {
      if (sessionState.isActive) {
        this.actor.send({ type: 'HEALTH_CHECK' });
      }
    }, 5 * 60 * 1000);
  }

  // Stop health checks
  private stopHealthChecks() {
    // Health checks will stop automatically when session ends
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Handle session expiration
  private handleSessionExpired() {
    console.warn('Session expired, redirecting to login');
    this.endSession();
    goto('/login');
  }

  // Clean up on destroy
  destroy() {
    this.actor.stop();
    this.stopActivityTracking();
    this.stopHealthChecks();
  }
}

// Create singleton session manager
export const sessionManager = new SessionManager();
;
// Reactive getters for use in components
export const isSessionActive = () => sessionState.isActive;
export const currentUser = () => sessionState.user;
export const sessionPermissions = () => sessionState.permissions;
export const sessionHealth = () => sessionState.health;
export const sessionAnalytics = () => sessionState.analytics;
export const securityLevel = () => sessionState.securityLevel;
;
// Convenience functions
export const hasPermission = (permission: string) => sessionManager.hasPermission(permission);
export const requirePermission = (permission: string) => sessionManager.requirePermission(permission);
export const recordActivity = (route: string, action: string, feature?: string) => {
  sessionManager.recordActivity(route, action, feature);
};

// Initialize session manager when module loads
if (browser) {
  // Auto-cleanup on page unload
  window.addEventListener('beforeunload', () => {
    sessionManager.destroy();
  });
}