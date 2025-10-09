// Custom Drizzle PostgreSQL Adapter for Lucia with fixed JOIN queries
// import { type Adapter, type DatabaseSession, type DatabaseUser } from 'lucia'
// Temporary type stubs for Lucia (not installed)
interface Adapter {
  deleteSession(sessionId: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  getSessionAndUser(sessionId: string): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]>;
  getUserSessions(userId: string): Promise<DatabaseSession[]>;
  setSession(session: DatabaseSession): Promise<void>;
  updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void>;
}
interface DatabaseSession {
  id: string;
  userId: string; // Main property used in code
  user_id?: string; // For DB compatibility
  expiresAt: Date; // Main property used in code
  expires_at?: Date; // For DB compatibility
  attributes: { [key: string]: any }
}
interface DatabaseUser {
  id: string;
  attributes: { [key: string]: any }
}
import { db } from '$lib/server/db/drizzle';
import { sessions, users } from '$lib/server/db/schema-postgres';
import { eq, lte } from 'drizzle-orm';
export class FixedDrizzlePostgreSQLAdapter implements Adapter {
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await db.delete(sessions).where(eq(sessions.id, sessionId),;
    } catch (error) {
      console.error('[AUTH] Error deleting session:', error);
      throw error;
    }
  }
  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.user_id, userId),;
  }
  async getSessionAndUser(
    sessionId: string,;
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    try {
      // Check if db and db.select exist
      if (!db || typeof db.select !== 'function') {
        console.error('[AUTH] Database connection not available:', {
          dbExists: !!db,
          selectExists: !!(db && typeof db.select === 'function'),
          dbType: typeof db
        });
        return [null, null];
      }
      // Build the correct JOIN query manually
      const result = await db;
        .select({
          // User fields
          user: users
          // Session fields;
          session: sessions
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.user_id, users.id)
        .where(eq(sessions.id, sessionId)
        .limit(1),;
      if ((result as { length?: any; map?: any }).length === 0) {
        return [null, null];
      }
      const { user, session } = result[0];
      // Transform to Lucia's expected format
      const databaseSession: DatabaseSession = {
        id: session.id,
        userId: session.user_id,
        expiresAt: session.expires_at,
        attributes: {
          ip_address: session.ip_address,
          user_agent: session.user_agent,
          session_context: session.session_context,
          created_at: session.created_at
        }
      }
      const databaseUser: DatabaseUser = {
        id: user.id,
        attributes: {
          email: user.email,
          firstName: null
          lastName: null
          role: 'user',
          isActive: true
          avatarUrl: null,;
          name: null
        }
      }
      return [databaseSession, databaseUser];
    } catch (error) {
      console.error('[AUTH] Error in getSessionAndUser:', error);
      return [null, null];
    }
  }
  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    const result = await db.select().from(sessions).where(eq(sessions.user_id, userId),;
    return (result as { length?: any; map?: any }).map((session) => ({
      id: session.id,
      userId: session.user_id,
      expiresAt: session.expires_at,
      attributes: {
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        session_context: session.session_context,
        created_at: session.created_at
      }
    }),;
  }
  async setSession(session: DatabaseSession): Promise<void> {
    await db.insert(sessions).values({
      id: session.id,
      user_id: session.userId,
      expires_at: session.expiresAt,
      ip_address: null
      user_agent: null
      session_context: { [key,: strin,g]: any },
      created_at: new Date()
    });
  }
  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    await db.update(sessions).set({ expires_at: expiresAt }).where(eq(sessions.id, sessionId),;
  }
  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lte(sessions.expires_at, new Date()),;
  }
}