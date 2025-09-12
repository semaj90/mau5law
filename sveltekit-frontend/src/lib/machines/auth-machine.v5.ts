import { setup, assign, createActor, fromPromise } from 'xstate';
import { AuthService } from '$lib/server/auth.js';

// Authentication context interface
export interface AuthContext {
  user: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    department?: string;
    jurisdiction?: string;
    permissions?: string[];
    isActive?: boolean;
    emailVerified?: boolean;
  } | null;
  session: {
    id?: string;
    expiresAt?: Date;
    fresh?: boolean;
  } | null;
  error?: string;
  isLoading: boolean;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    language?: string;
    timezone?: string;
    securityScore?: number;
  };
  loginAttempts: number;
  maxLoginAttempts: number;
  lastLoginAttempt?: Date;
  lockoutUntil?: Date;
  twoFactorRequired: boolean;
  registrationData?: unknown;
}

// Authentication events
type AuthEvent =
  | { type: 'START_LOGIN'; data: LoginData }
  | { type: 'START_REGISTRATION'; data: RegistrationData }
  | { type: 'LOGIN_SUCCESS'; data: { user: any; session: any } }
  | { type: 'LOGIN_FAILURE'; data: { error: string } }
  | { type: 'REGISTRATION_SUCCESS'; data: { user: any } }
  | { type: 'REGISTRATION_FAILURE'; data: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'REQUIRE_TWO_FACTOR' }
  | { type: 'TWO_FACTOR_SUCCESS'; data: { session: any } }
  | { type: 'TWO_FACTOR_FAILURE'; data: { error: string } }
  | { type: 'VERIFY_EMAIL' }
  | { type: 'EMAIL_VERIFIED' }
  | { type: 'RESET_PASSWORD'; data: { email: string } }
  | { type: 'PASSWORD_RESET_SENT' }
  | { type: 'ACCOUNT_LOCKED' }
  | { type: 'UNLOCK_ACCOUNT' }
  | { type: 'UPDATE_PROFILE'; data: any }
  | { type: 'PROFILE_UPDATED' }
  | { type: 'RETRY' };

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  deviceInfo?: unknown;
}

export interface RegistrationData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  department: string;
  jurisdiction: string;
  badgeNumber?: string;
  enableTwoFactor?: boolean;
  deviceInfo?: unknown;
}

const initialContext: AuthContext = {
  user: null,
  session: null,
  error: undefined,
  isLoading: false,
  deviceInfo: undefined,
  loginAttempts: 0,
  maxLoginAttempts: 5,
  lastLoginAttempt: undefined,
  lockoutUntil: undefined,
  twoFactorRequired: false,
  registrationData: undefined,
};

export const authMachine = setup({
  types: {} as {
    context: AuthContext;
    events: AuthEvent;
  },
  actions: {
    setLoading: assign({
      isLoading: () => true,
      error: () => undefined
    }),
    clearLoading: assign({
      isLoading: () => false
    }),
    setError: assign({
      error: ({ event }) => (event as any).data?.error || 'An error occurred',
      isLoading: () => false
    }),
    setUser: assign({
      user: ({ event }) => (event as any).data?.user || null,
      session: ({ event }) => (event as any).data?.session || null,
      isLoading: () => false,
      error: () => undefined,
      loginAttempts: () => 0
    }),
    clearUser: assign({
      user: () => null,
      session: () => null,
      error: () => undefined
    }),
    incrementLoginAttempts: assign({
      loginAttempts: ({ context }) => context.loginAttempts + 1,
      lastLoginAttempt: () => new Date()
    }),
    resetLoginAttempts: assign({
      loginAttempts: () => 0,
      lastLoginAttempt: () => undefined
    }),
    setLockout: assign({
      lockoutUntil: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      loginAttempts: () => 0
    }),
    clearLockout: assign({
      lockoutUntil: () => undefined
    }),
    setTwoFactorRequired: assign({
      twoFactorRequired: () => true
    }),
    clearTwoFactor: assign({
      twoFactorRequired: () => false
    }),
    setRegistrationData: assign({
      registrationData: ({ event }) => (event as any).data
    }),
    clearRegistrationData: assign({
      registrationData: () => undefined
    })
  },
  guards: {
    isMaxAttemptsReached: ({ context }) => {
      return context.loginAttempts >= context.maxLoginAttempts;
    },
    isAccountLocked: ({ context }) => {
      return context.lockoutUntil ? new Date() < context.lockoutUntil : false;
    }
  },
  actors: {
    authenticate: fromPromise(async ({ input }: { input: LoginData }) => {
      // Real authentication with local Windows native services
      const authService = new AuthService();

      try {
        const result = await authService.login(input.email, input.password);

        return {
          user: {
            id: result.id,
            email: result.email,
            firstName: result.firstName || 'User',
            lastName: result.lastName || '',
            role: result.role,
            permissions: ['read:cases', 'write:cases', 'ai:query'], // TODO: Get from user role
          },
          session: {
            id: 'session_' + result.id, // Generate session ID
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            fresh: true,
          },
        };
      } catch (error: any) {
        throw new Error(error instanceof Error ? error.message : 'Authentication failed');
      }
    }),
    register: fromPromise(async ({ input }: { input: RegistrationData }) => {
      // Real registration with local Windows native services
      const authService = new AuthService();

      try {
        const result = await authService.register({
          email: input.email,
          password: input.password,
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: `${input.firstName} ${input.lastName}`,
          // Removed legalSpecialties: not part of AuthService.register signature
        });

        return {
          user: {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            role: result.role,
            department: input.department,
            permissions: [],
          },
        };
      } catch (error: any) {
        throw new Error(error instanceof Error ? error.message : 'Registration failed');
      }
    }),
    logout: fromPromise(async () => {
      // Real logout with local Windows native services
      const authService = new AuthService();

      try {
        await (authService as any).logout();
        return { success: true };
      } catch (error: any) {
        // Log error but still return success for logout
        console.warn('Logout warning:', error);
        return { success: true };
      }
    }),
    resetPassword: fromPromise(async ({ input }: { input: { email: string } }) => {
      // Real password reset with local Windows native services
      const authService = new AuthService();

      try {
        await (authService as any).requestPasswordReset(input.email);
        return { success: true };
      } catch (error: any) {
        throw new Error(error instanceof Error ? error.message : 'Password reset failed');
      }
    })
  }
}).createMachine({
  id: 'auth',
  initial: 'idle',
  context: initialContext,
  states: {
    idle: {
      on: {
        START_LOGIN: {
          target: 'authenticating',
          guard: ({ context }) => !context.lockoutUntil || new Date() >= context.lockoutUntil
        },
        START_REGISTRATION: 'registering',
        RESET_PASSWORD: 'resettingPassword'
      }
    },
    authenticating: {
      entry: 'setLoading',
      invoke: {
        src: 'authenticate',
        input: ({ event }) => (event as any).data,
        onDone: [
          {
            target: 'requiresTwoFactor',
            guard: ({ event }) => (event as any).output?.requiresTwoFactor,
            actions: ['setTwoFactorRequired', 'clearLoading']
          },
          {
            target: 'authenticated',
            actions: ['setUser', 'resetLoginAttempts']
          }
        ],
        onError: [
          {
            target: 'locked',
            guard: 'isMaxAttemptsReached',
            actions: ['setLockout', 'setError']
          },
          {
            target: 'idle',
            actions: ['incrementLoginAttempts', 'setError']
          }
        ]
      }
    },
    requiresTwoFactor: {
      on: {
        TWO_FACTOR_SUCCESS: {
          target: 'authenticated',
          actions: ['setUser', 'clearTwoFactor', 'resetLoginAttempts']
        },
        TWO_FACTOR_FAILURE: {
          target: 'idle',
          actions: ['setError', 'clearTwoFactor']
        }
      }
    },
    authenticated: {
      entry: 'clearLoading',
      on: {
        LOGOUT: 'loggingOut',
        SESSION_EXPIRED: 'idle',
        UPDATE_PROFILE: 'updatingProfile'
      }
    },
    loggingOut: {
      entry: 'setLoading',
      invoke: {
        src: 'logout',
        onDone: {
          target: 'idle',
          actions: ['clearUser', 'clearLoading']
        },
        onError: {
          target: 'idle',
          actions: ['clearUser', 'setError']
        }
      }
    },
    registering: {
      entry: ['setLoading', 'setRegistrationData'],
      invoke: {
        src: 'register',
        input: ({ event }) => (event as any).data,
        onDone: {
          target: 'registrationSuccess',
          actions: ['setUser', 'clearRegistrationData']
        },
        onError: {
          target: 'idle',
          actions: ['setError', 'clearRegistrationData']
        }
      }
    },
    registrationSuccess: {
      on: {
        EMAIL_VERIFIED: 'authenticated',
        VERIFY_EMAIL: 'verifyingEmail'
      },
      after: {
        5000: 'authenticated' // Auto-advance after 5 seconds
      }
    },
    verifyingEmail: {
      entry: 'setLoading',
      after: {
        2000: {
          target: 'authenticated',
          actions: 'clearLoading'
        }
      }
    },
    resettingPassword: {
      entry: 'setLoading',
      invoke: {
        src: 'resetPassword',
        input: ({ event }) => ({ email: (event as any).data.email }),
        onDone: {
          target: 'passwordResetSent',
          actions: 'clearLoading'
        },
        onError: {
          target: 'idle',
          actions: 'setError'
        }
      }
    },
    passwordResetSent: {
      after: {
        3000: 'idle'
      }
    },
    locked: {
      entry: 'setLockout',
      on: {
        UNLOCK_ACCOUNT: {
          target: 'idle',
          actions: ['clearLockout', 'resetLoginAttempts']
        }
      },
      after: {
        900000: { // 15 minutes
          target: 'idle',
          actions: ['clearLockout', 'resetLoginAttempts']
        }
      }
    },
    updatingProfile: {
      entry: 'setLoading',
      after: {
        1500: {
          target: 'authenticated',
          actions: 'clearLoading'
        }
      }
    }
  }
});

// Create the actor
export const authActor = createActor(authMachine);
;
// Export for use in components
export default authActor;