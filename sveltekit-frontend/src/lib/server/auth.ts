// src/lib/server/auth.ts - Lucia v3 Authentication Setup for SvelteKit 2
import { Lucia, TimeSpan, generateId } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { dev } from "$app/environment";
import { db } from "$lib/server/db";
import { users, sessions } from "$lib/server/db/schema-postgres";
import { eq } from "drizzle-orm";
import { Argon2id } from "oslo/password";
import type { RequestEvent } from "@sveltejs/kit";

// Create Drizzle adapter for Lucia v3
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

// Initialize Lucia with proper configuration
export const lucia = new Lucia(adapter, {
	sessionExpiresIn: new TimeSpan(30, "d"), // 30 days
	sessionCookie: {
		name: "legal_ai_session",
		expires: false, // session cookies have very long lifespan (2 years)
		attributes: {
			secure: !dev, // set `Secure` flag in HTTPS
			sameSite: "lax"
		}
	},
	getUserAttributes: (attributes) => {
		return {
			email: attributes.email,
			firstName: attributes.firstName,
			lastName: attributes.lastName,
			role: attributes.role,
			isActive: attributes.isActive,
			avatarUrl: attributes.avatarUrl,
			name: attributes.name
		};
	}
});

// Type definitions for Lucia v3
declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
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
}

// Authentication utilities
export class AuthService {
  private argon2id = new Argon2id();

  /**
   * Register a new user with enhanced profile data
   */
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  }) {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

    if (existingUser.length > 0) {
      throw new Error("User already exists");
    }

    // Hash password
    const passwordHash = await this.argon2id.hash(data.password);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: data.email,
      hashedPassword: passwordHash,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || null,
      isActive: true
    }).returning();

    return newUser;
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string) {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !user.hashedPassword) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    // Verify password
    const validPassword = await this.argon2id.verify(user.hashedPassword, password);

    if (!validPassword) {
      throw new Error("Invalid email or password");
    }

    return user;
  }

  /**
   * Handle failed login attempts (simplified - no account locking)
   */
  private async handleFailedLogin(userId: string) {
    console.log(`Failed login attempt for user: ${userId}`);
    // TODO: Implement proper failed login tracking when schema supports it
  }

  /**
   * Create session for user
   */
  async createSession(userId: string) {
    const session = await lucia.createSession(userId, {});
    return session;
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string) {
    const result = await lucia.validateSession(sessionId);
    return result;
  }

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(sessionId: string) {
    await lucia.invalidateSession(sessionId);
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateUserSessions(userId: string) {
    await lucia.invalidateUserSessions(userId);
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionId?: string) {
    if (sessionId) {
      await this.invalidateSession(sessionId);
    }
  }

  /**
   * Request password reset (placeholder for email integration)
   */
  async requestPasswordReset(email: string) {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      // Don't reveal if email exists or not for security
      return { success: true };
    }

    // TODO: Implement email sending service
    // For now, just log the reset request
    console.log(`Password reset requested for user: ${email}`);

    return { success: true };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    timezone: string;
    locale: string;
    legalSpecialties: string[];
    preferences: Record<string, any>;
  }>) {
    // Map camelCase input to snake_case database columns
    const updateData: any = {};

    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.displayName !== undefined) updateData.username = data.displayName;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.legalSpecialties !== undefined) updateData.practice_areas = data.legalSpecialties;
    if (data.preferences !== undefined) updateData.metadata = data.preferences;

    // Add timestamp
    updateData.updated_at = new Date();

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.hashed_password) {
      throw new Error("User not found");
    }

    // Verify current password
    const validPassword = await this.argon2id.verify(user.hashed_password, currentPassword);

    if (!validPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await this.argon2id.hash(newPassword);

    // Update password
    await db.update(users)
      .set({
        hashed_password: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

    // Invalidate all existing sessions to force re-login
    await this.invalidateUserSessions(userId);
  }
}

export const authService = new AuthService();
/**
 * Helper function to get user from request event
 */
export async function getUser(event: RequestEvent): Promise<any> {
  const sessionId = event.cookies.get(lucia.sessionCookieName);

  if (!sessionId) {
    return { user: null, session: null };
  }

  const result = await lucia.validateSession(sessionId);

  if (result.session && result.session.fresh) {
    const sessionCookie = lucia.createSessionCookie(result.session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/'
    });
  }

  if (!result.session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      ...sessionCookie.attributes,
      path: '/'
    });
  }

  return result;
}

/**
 * Require authenticated user middleware
 */
export async function requireAuth(event: RequestEvent): Promise<any> {
  const { user, session } = await getUser(event);

  if (!user || !session) {
    throw new Error("Authentication required");
  }

  return { user, session };
}
