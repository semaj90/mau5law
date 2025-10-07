/**
 * Global Authentication Store - SvelteKit 2 + Svelte 5 Best Practices
 * Uses modern reactive patterns with $state runes and XState integration
 */
import type { SessionUser } from '$lib/types/auth';
import { createMachine, assign, fromPromise, createActor } from 'xstate';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { writable, get } from 'svelte/store';
// Authentication context
export interface AuthContext {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  redirectPath: string | null;
}
// Authentication events
type AuthEvents =
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'REGISTER'; userData: RegisterData }
  | { type: 'LOGOUT' }
  | { type: 'CHECK_AUTH' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_REDIRECT'; path: string }
  | { type: 'AUTHENTICATED'; user: SessionUser }
  | { type: 'UNAUTHENTICATED' };
export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}
// API services
const loginService = fromPromise(async ({ input }: { input: { email: string; password: string } }) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }
  return await response.json();
});
const registerService = fromPromise(async ({ input }: { input: RegisterData }) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }
  return await response.json();
});
const logoutService = fromPromise(async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Logout failed');
  }
  return true;
});
const checkAuthService = fromPromise(async () => {
  const response = await fetch('/api/auth/check');
  if (!response.ok) {
    throw new Error('Not authenticated');
  }
  return await response.json();
});
// Authentication state machine
const authMachine = createMachine({
  id: 'auth',
  // Note: types field removed for compatibility with project TS setup
  context: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    redirectPath: null,
  },
  initial: 'checking',
  states: {
    checking: {
      entry: assign({ isLoading: () => true }),
      invoke: {
        src: checkAuthService,
        onDone: {
          target: 'authenticated',
          actions: [
            assign({
              // typed done event
              user: (_ctx, event: DoneEventWithUser) => event.output?.user ?? null,
              isAuthenticated: () => true,
              isLoading: () => false,
              error: () => null,
            }),
          ],
        },
        onError: {
          target: 'unauthenticated',
          actions: assign({
            user: () => null,
            isAuthenticated: () => false,
            isLoading: () => false,
            error: () => null,
          }),
        },
      },
    },
    unauthenticated: {
      on: {
        LOGIN: {
          target: 'loggingIn',
        },
        REGISTER: {
          target: 'registering',
        },
        SET_REDIRECT: {
          actions: assign({
            // narrow event using the AuthEvents union
            redirectPath: (_ctx, event: AuthEvents) => (event.type === 'SET_REDIRECT' ? event.path : null),
          }),
        },
      },
    },
    loggingIn: {
      entry: assign({
        isLoading: () => true,
        error: () => null,
      }),
      invoke: {
        src: loginService,
        // ensure only LOGIN event provides the input
        input: ({ event }: { event: AuthEvents }) => {
          if (event.type !== 'LOGIN') throw new Error('Invalid event for login invoke');
          return { email: event.email, password: event.password };
        },
        onDone: {
          target: 'authenticated',
          actions: [
            assign({
              user: (_ctx, event: DoneEventWithUser) => event.output?.user ?? null,
              isAuthenticated: () => true,
              isLoading: () => false,
              error: () => null,
            }),
            // Use typed ctx instead of any
            (ctx: AuthContext, _event: DoneEventNoPayload) => {
              if (browser) {
                const rs = ctx?.redirectPath;
                if (rs) goto(rs);
                else goto('/dashboard');
              }
            },
          ],
        },
        onError: {
          target: 'unauthenticated',
          actions: assign({
            isLoading: () => false,
            // typed error event
            error: (_ctx, event: InvokeErrorEvent) => (event.data?.message ?? event.error?.message) || 'Login failed',
          }),
        },
      },
    },
    registering: {
      entry: assign({
        isLoading: () => true,
        error: () => null,
      }),
      invoke: {
        src: registerService,
        input: ({ event }: { event: AuthEvents }) => {
          if (event.type !== 'REGISTER') throw new Error('Invalid event for register invoke');
          return event.userData;
        },
        onDone: {
          target: 'authenticated',
          actions: [
            assign({
              user: (_ctx, event: DoneEventWithUser) => event.output?.user ?? null,
              isAuthenticated: () => true,
              isLoading: () => false,
              error: () => null,
            }),
            // Redirect to dashboard after registration
            () => {
              if (browser) {
                goto('/dashboard');
              }
            },
          ],
        },
        onError: {
          target: 'unauthenticated',
          actions: assign({
            isLoading: () => false,
            error: (_ctx, event: InvokeErrorEvent) =>
              (event.data?.message ?? event.error?.message) || 'Registration failed',
          }),
        },
      },
    },
    authenticated: {
      entry: assign({
        isAuthenticated: () => true,
        isLoading: () => false,
        redirectPath: () => null,
      }),
      on: {
        LOGOUT: {
          target: 'loggingOut',
        },
        UNAUTHENTICATED: {
          target: 'unauthenticated',
          actions: assign({
            user: () => null,
            isAuthenticated: () => false,
          }),
        },
      },
    },
    loggingOut: {
      entry: assign({ isLoading: () => true }),
      invoke: {
        src: logoutService,
        onDone: {
          target: 'unauthenticated',
          actions: [
            assign({
              user: () => null,
              isAuthenticated: () => false,
              isLoading: () => false,
              error: () => null,
            }),
            // Redirect to home after logout
            () => {
              if (browser) {
                goto('/');
              }
            },
          ],
        },
        onError: {
          target: 'authenticated',
          actions: assign({
            isLoading: () => false,
            error: () => 'Logout failed',
          }),
        },
      },
    },
  },
  on: {
    CLEAR_ERROR: {
      actions: assign({ error: () => null }),
    },
    CHECK_AUTH: {
      target: '.checking',
    },
  },
});
// Create global auth store using SvelteKit 2 patterns
class AuthStore {
  // Replace $state-backed fields with a writable store + plain actor reference
  #machineStateStore = writable({
    context: {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      redirectPath: null,
    },
    value: 'checking',
  });
  #actor: any = null;

  constructor() {
    if (browser) {
      // createActor is statically imported from xstate
      this.#actor = createActor(authMachine);
      this.#actor.start();
      // Subscribe to authentication state changes and update the writable store
      this.#actor.subscribe((state: any) => {
        this.#machineStateStore.set({
          context: state.context,
          value: state.value,
        });
      });
      // Kick off initial auth check
      this.#actor.send({ type: 'CHECK_AUTH' });
    }
  }
  // Reactive getters using get() on the writable store
  get isAuthenticated() {
    return get(this.#machineStateStore).context?.isAuthenticated ?? false;
  }
  get user() {
    return get(this.#machineStateStore).context?.user ?? null;
  }
  get isLoading() {
    return get(this.#machineStateStore).context?.isLoading ?? false;
  }
  get error() {
    return get(this.#machineStateStore).context?.error ?? null;
  }
  get currentState() {
    return get(this.#machineStateStore).value ?? 'checking';
  }
  // User role helpers
  get isAdmin() {
    return this.user?.role === 'admin';
  }
  get isProsecutor() {
    return this.user?.role === 'prosecutor';
  }
  get isDetective() {
    return this.user?.role === 'detective';
  }
  // Actions
  login = (email: string, password: string) => {
    this.#actor?.send({ type: 'LOGIN', email, password });
  };
  register = (userData: RegisterData) => {
    this.#actor?.send({ type: 'REGISTER', userData });
  };
  logout = () => {
    this.#actor?.send({ type: 'LOGOUT' });
  };
  clearError = () => {
    this.#actor?.send({ type: 'CLEAR_ERROR' });
  };
  setRedirect = (path: string) => {
    this.#actor?.send({ type: 'SET_REDIRECT', path });
  };
  checkAuth = () => {
    this.#actor?.send({ type: 'CHECK_AUTH' });
  };
  // Permission helpers
  hasPermission = (permission: string): boolean => {
    if (!this.user) return false;
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_cases', 'manage_evidence'],
      prosecutor: ['read', 'write', 'manage_cases', 'manage_evidence'],
      detective: ['read', 'write', 'manage_evidence'],
      user: ['read'],
    };
    return rolePermissions[this.user.role as keyof typeof rolePermissions]?.includes(permission) ?? false;
  };
  canAccessCase = (caseId: string): boolean => {
    // Implement case-specific access control
    return this.hasPermission('read');
  };
  canEditCase = (caseId: string): boolean => {
    return this.hasPermission('write');
  };
  canDeleteCase = (caseId: string): boolean => {
    return this.hasPermission('delete');
  };
}
// Export singleton instance
export const authStore = new AuthStore();
// Auth guards for routes
export function requireAuth() {
  return {
    beforeNavigate: ({ to }: { to: any }) => {
      if (!authStore.isAuthenticated) {
        authStore.setRedirect(to.pathname);
        goto('/auth/login');
        return false;
      }
      return true;
    },
  };
}
export function requireRole(role: string) {
  return {
    beforeNavigate: ({ to }: { to: any }) => {
      if (!authStore.isAuthenticated) {
        authStore.setRedirect(to.pathname);
        goto('/auth/login');
        return false;
      }
      if (authStore.user?.role !== role && authStore.user?.role !== 'admin') {
        goto('/unauthorized');
        return false;
      }
      return true;
    },
  };
}
export function requirePermission(permission: string) {
  return {
    beforeNavigate: ({ to }: { to: any }) => {
      if (!authStore.isAuthenticated) {
        authStore.setRedirect(to.pathname);
        goto('/auth/login');
        return false;
      }
      if (!authStore.hasPermission(permission)) {
        goto('/unauthorized');
        return false;
      }
      return true;
    },
  };
}
// Utility for components - Use the authStore directly
// In Svelte 5, components should access authStore properties directly
// Example: const { user, isAuthenticated } = authStore
export const useAuth = () => authStore;
// Utility for components - Use the authStore directly
// In Svelte 5, components should access authStore properties directly
// Example: const { user, isAuthenticated } = authStore
export const useAuth = () => authStore;
// Add small helper types (placed near top of file, after AuthEvents/RegisterData)
type DoneEventWithUser = { output?: { user?: SessionUser } };
type DoneEventNoPayload = { output?: any };
type InvokeErrorEvent = { data?: { message?: string }; error?: { message?: string } };
