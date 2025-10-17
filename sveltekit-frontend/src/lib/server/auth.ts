// src/lib/server/auth.ts - Lucia v3 Authentication Setup for SvelteKit 2
import { lucia } from "lucia";
import { sveltekit } from "lucia/middleware";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pg } from "@lucia-auth/adapter-drizzle";
import { Argon2id } from "oslo/password";
import { eq } from "drizzle-orm";
import { users } from "$lib/server/db/schema";
import type { RequestEvent } from '@sveltejs/kit';
import type { Session, User } from "lucia";
import xstateIntegration from '$lib/services/xstate-integration';

// Database connection with connection pooling for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle(pool);

export const auth = lucia({
  adapter: pg(db),
  env: process.env.NODE_ENV === "production" ? "PROD" : "DEV",
  middleware: sveltekit(),
  sessionCookie: {
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    }
  }
});

export type Auth = typeof auth;

declare module 'lucia' {
  interface Register {
    Lucia: typeof auth;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  name: string | null;
  hashedPassword: string | null;
}

/**
 * AuthService - Production-ready authentication with XState integration
 * Integrates with Lucia v3, Drizzle ORM, PostgreSQL, and XState v5
 */
export class AuthService {
  private argon2id = new Argon2id();

  /**
   * Register a new user with validation and XState session management
   */
  async register(data: {
    email: string;
    password: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  }) {
    try {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('User already exists');
      }

      const passwordHash = await this.argon2id.hash(data.password);
      const [newUser] = await db
        .insert(users)
        .values({
          email: data.email,
          hashedPassword: passwordHash,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          name: data.displayName ?? `${data.firstName || ''} ${data.lastName || ''}`.trim() || null,
          isActive: true,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Wire to XState auth machine
      xstateIntegration.sendEvent('auth-machine', {
        type: 'USER_REGISTERED',
        userId: newUser.id,
        email: newUser.email,
      });

      return newUser;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user with credentials and session creation
   */
  async login(email: string, password: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user || !user.hashedPassword) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      const validPassword = await this.argon2id.verify(user.hashedPassword, password);
      if (!validPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Notify XState session machine
      xstateIntegration.sendEvent('session-machine', {
        type: 'LOGIN_SUCCESS',
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Create session for user
   */
  async createSession(userId: string) {
    try {
      const session = await auth.createSession(userId, {});
      return session;
    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string) {
    try {
      const result = await auth.validateSession(sessionId);
      return result;
    } catch (error) {
      console.error('Session validation failed:', error);
      throw error;
    }
  }

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(sessionId: string) {
    try {
      await auth.invalidateSession(sessionId);
      xstateIntegration.sendEvent('session-machine', {
        type: 'LOGOUT',
        sessionId,
      });
    } catch (error) {
      console.error('Session invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateUserSessions(userId: string) {
    try {
      await auth.invalidateUserSessions(userId);
    } catch (error) {
      console.error('Invalidating user sessions failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile with CRUD persistence
   */
  async updateProfile(userId: string, data: Partial<{
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    legalSpecialties: string | null;
    preferences: Record<string, any> | null;
  }>) {
    try {
      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.displayName !== undefined) updateData.name = data.displayName;
      if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
      if (data.legalSpecialties !== undefined) updateData.practiceAreas = data.legalSpecialties;
      if (data.preferences !== undefined) updateData.metadata = data.preferences;

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Sync with XState AI assistant machine
      xstateIntegration.sendEvent('ai-assistant-machine', {
        type: 'PROFILE_UPDATED',
        userId,
        profile: updatedUser,
      });

      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Change user password with session invalidation
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.hashedPassword) {
        throw new Error('User not found');
      }

      const validPassword = await this.argon2id.verify(user.hashedPassword, currentPassword);
      if (!validPassword) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await this.argon2id.hash(newPassword);

      await db
        .update(users)
        .set({
          hashedPassword: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Force re-login by invalidating all sessions
      await this.invalidateUserSessions(userId);

      xstateIntegration.sendEvent('auth-machine', {
        type: 'PASSWORD_CHANGED',
        userId,
      });
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Get case by ID via Go microservice
   */
  async getCaseById(caseId: string) {
    try {
      const response = await fetch(`${process.env.LEGAL_GATEWAY_URL || 'http://localhost:8080'}/cases/${caseId}`, {
        headers: { 'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get case by ID:', error);
      return null;
    }
  }

  /**
   * Get documents for a case via Go microservice
   */
  async getCaseDocuments(caseId: string) {
    try {
      const response = await fetch(
        `${process.env.LEGAL_GATEWAY_URL || 'http://localhost:8080'}/cases/${caseId}/documents`,
        {
          headers: { 'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
        }
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get case documents:', error);
      return [];
    }
  }

  /**
   * Get total number of cases
   */
  async getTotalCases(): Promise<number> {
    try {
      const response = await fetch(
        `${process.env.LEGAL_GATEWAY_URL || 'http://localhost:8080'}/cases/count`,
        {
          headers: { 'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
        }
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Failed to get total cases:', error);
      return 0;
    }
  }

  /**
   * Get total number of documents
   */
  async getTotalDocuments(): Promise<number> {
    try {
      const response = await fetch(
        `${process.env.LEGAL_GATEWAY_URL || 'http://localhost:8080'}/documents/count`,
        {
          headers: { 'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
        }
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Failed to get total documents:', error);
      return 0;
    }
  }

  /**
   * Get sample cases for demo page
   */
  async getSampleCases(limit: number = 5) {
    try {
      const response = await fetch(
        `${process.env.LEGAL_GATEWAY_URL || 'http://localhost:8080'}/cases?limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
        }
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get sample cases:', error);
      return [];
    }
  }

  /**
   * Health check for auth service
   */
  async health() {
    try {
      await pool.query('SELECT 1');
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      console.error('Auth service health check failed:', error);
      return { status: 'unhealthy', error: String(error) };
    }
  }
}

export const authService = new AuthService();

/**
 * Helper function to get user from request event with session validation
 */
export async function getUser(event: RequestEvent): Promise<{ user: User | null; session: Session | null }> {
  try {
    const sessionId = event.cookies.get(auth.sessionCookieName);
    if (!sessionId) {
      return { user: null, session: null };
    }

    const { user, session } = await auth.validateSession(sessionId);

    if (session && session.fresh) {
      const sessionCookie = auth.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        ...sessionCookie.attributes,
        path: '/',
      });
    }

    if (!session) {
      const sessionCookie = auth.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        ...sessionCookie.attributes,
        path: '/',
      });
    }

    return { user, session };
  } catch (error) {
    console.error('User retrieval failed:', error);
    return { user: null, session: null };
  }
}

/**
 * Require authenticated user middleware
 */
export async function requireAuth(event: RequestEvent): Promise<{ user: User; session: Session }> {
  const { user, session } = await getUser(event);
  if (!user || !session) {
    throw new Error('Authentication required');
  }
  return { user, session };
}
    try {
      // This would count from documents table in production
      return 156; // Mock data
    } catch (error) {
      console.error('Failed to get total documents:', error);
      return 0;
    }
  }
  /**
   * Get sample cases for demo page
   */
  async getSampleCases(limit: number = 5) {
    try {
      // This would fetch from cases table in production
      // For now, return mock data
      return Array.from({ length: limit }, (_, i) => ({
        id: `case_${i + 1}`,
        title: `Sample Case ${i + 1}`,
        description: `Description for case ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'closed',
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      }));
    } catch (error) {
      console.error('Failed to get sample cases:', error);
      return [];
    }
  }
}
export const authService = new AuthService();
/**
 * Helper function to get user from request event
 */ export async function getUser(event: RequestEvent): Promise<any> {
  const sessionId = event.cookies.get(lucia.sessionCookieName);
  if (!sessionId) {
    return { user: null, session: null };
  }
  const result = await lucia.validateSession(sessionId);
  if ((result as { session?: any }).session && (result as { session?: any }).session.fresh) {
    const sessionCookie = lucia.createSessionCookie((result as { session?: any }).session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/',
    });
  }
  if (!(result as { session?: any }).session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/',
    });
  }
  return result;
}
/**
 * Require authenticated user middleware
 */ export async function requireAuth(event: RequestEvent): Promise<any> {
  const { user, session } = await getUser(event);
  if (!user || !session) {
    throw new Error('Authentication required');
  }
  return { user, session };
}
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/',
    });
  }
  return result;
}
/**
 * Require authenticated user middleware
 */ export async function requireAuth(event: RequestEvent): Promise<any> {
  const { user, session } = await getUser(event);
  if (!user || !session) {
    throw new Error('Authentication required');
  }
  return { user, session };
}
