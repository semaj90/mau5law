/**
 * User Management Database Operations
 * Complete CRUD with PostgreSQL + pgvector + Drizzle ORM
 */
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, isNull, count, sql, desc, cosineDistance } from 'drizzle-orm';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import type {
  User,
  NewUser,
  UserProfile,
  NewUserProfile,
  NewUserSession,
  UserActivity,
  NewUserActivity,
  FullUserProfile,
} from './schema/user-management'; // changed: remove .js
import {
  users,
  userProfiles,
  userSessions,
  userActivityLog,
  insertUserSchema,
  updateUserSchema,
  insertProfileSchema,
  updateProfileSchema,
} from './schema/user-management'; // changed: remove .js
// ============================================================================
// DATABASE CONNECTION
// ============================================================================
const connectionString =
  import.meta.env.DATABASE_URL ||
  `postgresql://${import.meta.env.DATABASE_USER || 'legal_admin'}:${import.meta.env.DATABASE_PASSWORD || '123456'}@${import.meta.env.DATABASE_HOST || 'localhost'}:${import.meta.env.DATABASE_PORT || '5433'}/${import.meta.env.DATABASE_NAME || 'legal_ai_db'}`;
// Create connection with pgvector support
// NOTE: removed complex custom `types` mapping here which can cause parse/type issues.
// If you need custom pgvector serialization, re-introduce a tested mapping or
// use a separate helper to handle vector serialization/parsing.
const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});
// Use explicit PostgresJsDatabase type for correct transaction `tx` typing
type Db = PostgresJsDatabase;
const userDb = drizzle(queryClient) as Db;
const db: Db = userDb;
// ============================================================================
// USER AUTHENTICATION OPERATIONS
// ============================================================================
export class UserAuthService {
  /**
   * Register a new user with complete profile setup
   */
  static async registerUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    jurisdiction?: string;
    practiceAreas?: string[];
    profileData?: Partial<NewUserProfile>;
  }): Promise<{ user: User | null; profile?: UserProfile | undefined; success: boolean; error?: string }> {
    try {
      // Validate input
      const validatedUser = insertUserSchema.parse({
        email: userData.email.toLowerCase(),
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        role: userData.role || 'user',
        jurisdiction: userData.jurisdiction ?? null,
        practiceAreas: userData.practiceAreas ?? null,
        passwordHash: await bcrypt.hash(userData.password, 12),
      });
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, validatedUser.email)).limit(1);
      if (existingUser.length > 0) {
        return { user: existingUser[0], success: false, error: 'User already exists' };
      }
      // Create user with transaction
      const result = await userDb.transaction(async tx => {
        // Insert user
        const insertedUsers = await tx.insert(users).values(validatedUser).returning();
        const newUser = (insertedUsers[0] as unknown) as User;
        // Create profile if profile data provided
        let profile: UserProfile | undefined;
        if (userData.profileData) {
          const profileData = insertProfileSchema.parse({
            userId: newUser.id,
            ...userData.profileData,
          });
          const insertedProfiles = await tx.insert(userProfiles).values(profileData).returning();
          profile = (insertedProfiles[0] as unknown) as UserProfile;
        }
        // Log registration activity
        await tx.insert(userActivityLog).values({
          userId: newUser.id,
          action: 'user_registered',
          resource: 'user',
          resourceId: newUser.id.toString(),
          context: {
            registrationMethod: 'email',
            role: newUser.role,
            jurisdiction: newUser.jurisdiction,
          },
          success: true,
          timestamp: new Date(),
        });
        return { user: newUser, profile };
      });
      return { ...result, success: true };
    } catch (error: unknown) {
      console.error('User registration error:', error);
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }
  /**
   * Authenticate user login
   */
  static async authenticateUser(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    user?: User;
    profile?: UserProfile;
    session?: Record<string, unknown>;
    success: boolean;
    error?: string;
  }> {
    try {
      // Find user with profile
      const userWithProfile = await db
        .select()
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(and(eq(users.email, email.toLowerCase()), eq(users.isActive, true), isNull(users.deletedAt)))
        .limit(1);
      if (userWithProfile.length === 0) {
        return { success: false, error: 'Invalid credentials' };
      }
      const userDataRow = userWithProfile[0] as unknown as { users: User; user_profiles?: UserProfile };
      const user = userDataRow.users;
      const profile = userDataRow.user_profiles;
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        // Log failed login attempt
        await userDb.insert(userActivityLog).values({
          userId: user.id,
          action: 'login_failed',
          resource: 'auth',
          context: { reason: 'invalid_password' },
          success: false,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          timestamp: new Date(),
        });
        return { success: false, error: 'Invalid credentials' };
      }
      // Create session
      const sessionId = nanoid(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const insertedSessions = await userDb
        .insert(userSessions)
        .values({
          userId: user.id,
          sessionId,
          expiresAt,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          sessionContext: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      const session = (insertedSessions[0] as unknown) as NewUserSession;
      // Update last login time
      await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
      // Log successful login
      await userDb.insert(userActivityLog).values({
        userId: user.id,
        action: 'login_success',
        resource: 'auth',
        context: { sessionId },
        success: true,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        timestamp: new Date(),
      });
      return {
        user,
        profile: profile || undefined,
        session: session as Record<string, unknown>,
        success: true,
      };
    } catch (error: unknown) {
      console.error('Authentication error:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }
  /**
   * Validate session and get user data
   */
  static async validateSession(
    sessionId: string
  ): Promise<{ valid: boolean; user?: User; profile?: UserProfile; session?: Record<string, unknown> }> {
    try {
      const sessionData = await db
        .select()
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(
          and(
            eq(userSessions.sessionId, sessionId),
            eq(userSessions.isActive, true),
            sql`${userSessions.expiresAt} > NOW()`
          )
        )
        .limit(1);
      if (sessionData.length === 0) {
        return { valid: false };
      }
      const data = sessionData[0] as unknown as {
        users: User;
        user_profiles?: UserProfile;
        user_sessions?: Record<string, unknown>;
      };
      return {
        user: data.users,
        profile: data.user_profiles || undefined,
        session: data.user_sessions,
        valid: true,
      };
    } catch (error: unknown) {
      console.error('Session validation error:', error instanceof Error ? error.message : String(error));
      return { valid: false };
    }
  }
  /**
   * Logout user by invalidating session
   */
  static async logoutUser(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(userSessions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(userSessions.sessionId, sessionId));
      return { success: true };
    } catch (error: unknown) {
      console.error('Logout error:', error instanceof Error ? error.message : String(error));
      return { success: false, error: error instanceof Error ? error.message : 'Logout failed' };
    }
  }
}
// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================
export class UserProfileService {
  /**
   * Get complete user profile with all related data
   */
  static async getFullUserProfile(userId: number): Promise<FullUserProfile | null> {
    try {
      // Get user with profile
      const userData = await db
        .select()
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(and(eq(users.id, userId), eq(users.isActive, true), isNull(users.deletedAt)))
        .limit(1);
      if (userData.length === 0) return null;
      const row = userData[0] as unknown as { users: User; user_profiles?: UserProfile };
      const user = row.users;
      const profile = row.user_profiles;
      // Get active sessions
      const sessions = await db
        .select()
        .from(userSessions)
        .where(
          and(eq(userSessions.userId, userId), eq(userSessions.isActive, true), sql`${userSessions.expiresAt} > NOW()`)
        )
        .orderBy(desc(userSessions.createdAt));
      // Get recent activity
      const recentActivity = await db
        .select()
        .from(userActivityLog)
        .where(eq(userActivityLog.userId, userId))
        .orderBy(desc(userActivityLog.timestamp))
        .limit(20);
      return {
        ...user,
        profile: profile || undefined,
        sessions,
        recentActivity,
      } as FullUserProfile;
    } catch (error: unknown) {
      console.error('Get full profile error:', error);
      return null;
    }
  }
  /**
   * Update user profile information
   */
  static async updateUserProfile(
    userId: number,
    updates: Partial<NewUser & NewUserProfile>
  ): Promise<{ user?: User; profile?: UserProfile; success: boolean; error?: string }> {
    try {
      const result = await userDb.transaction(async tx => {
        let updatedUser: User | undefined;
        let updatedProfile: UserProfile | undefined;
        // Destructure typed updates to avoid any casts
        const {
          barNumber,
          firmName,
          phoneNumber,
          address,
          licenseNumber,
          yearsOfExperience,
          specializations,
          education,
          preferences,
          avatarUrl,
          bio,
        } = updates as Partial<NewUser & NewUserProfile>;
        // Update user table fields
        const userFields = {
          firstName: updates.firstName,
          lastName: updates.lastName,
          jurisdiction: updates.jurisdiction,
          practiceAreas: updates.practiceAreas,
          barNumber,
          firmName,
          updatedAt: new Date(),
        };
        // Filter out undefined values
        const userUpdates = Object.fromEntries(Object.entries(userFields).filter(([_, value]) => value !== undefined));
        if (Object.keys(userUpdates).length > 0) {
          const validatedUpdates = updateUserSchema.parse(userUpdates);
          [updatedUser] = await (tx
            .update(users)
            .set(validatedUpdates)
            .where(eq(users.id, userId))
            .returning() as Promise<User[]>);
        }
        // Update profile table fields
        const profileFields = {
          phoneNumber,
          address,
          licenseNumber,
          yearsOfExperience,
          specializations,
          education,
          preferences,
          avatarUrl,
          bio,
          updatedAt: new Date(),
        };
        const profileUpdates = Object.fromEntries(
          Object.entries(profileFields).filter(([_, value]) => value !== undefined)
        );
        if (Object.keys(profileUpdates).length > 0) {
          const validatedProfileUpdates = updateProfileSchema.parse(profileUpdates);
          // Check if profile exists
          const existingProfile = await tx.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
          if (existingProfile.length > 0) {
            // Update existing profile
            const updatedProfiles = await tx
              .update(userProfiles)
              .set(validatedProfileUpdates)
              .where(eq(userProfiles.userId, userId))
              .returning();
            updatedProfile = (updatedProfiles[0] as unknown) as UserProfile;
          } else {
            // Create new profile
            const insertedProfiles = await tx
              .insert(userProfiles)
              .values({ userId, ...validatedProfileUpdates })
              .returning();
            updatedProfile = (insertedProfiles[0] as unknown) as UserProfile;
          }
        }
        // Log update activity
        await tx.insert(userActivityLog).values({
          userId,
          action: 'profile_updated',
          resource: 'user_profile',
          resourceId: userId.toString(),
          context: {
            updatedFields: [...Object.keys(userUpdates), ...Object.keys(profileUpdates)],
          },
          success: true,
          timestamp: new Date(),
        });
        return { user: updatedUser, profile: updatedProfile };
      });
      return { ...result, success: true };
    } catch (error: unknown) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Profile update failed',
      };
    }
  }
  /**
   * Delete user account (soft delete)
   */
  static async deleteUser(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await userDb.transaction(async tx => {
        // Soft delete user
        await tx
          .update(users)
          .set({
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
        // Invalidate all sessions
        await tx
          .update(userSessions)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(userSessions.userId, userId));
        // Log deletion activity
        await tx.insert(userActivityLog).values({
          userId,
          action: 'user_deleted',
          resource: 'user',
          resourceId: userId.toString(),
          context: { deletionType: 'soft_delete' },
          success: true,
          timestamp: new Date(),
        });
      });
      return { success: true };
    } catch (error: unknown) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User deletion failed',
      };
    }
  }
  /**
   * Find similar users based on profile embedding (AI recommendations)
   */
  static async findSimilarUsers(userId: number, limit: number = 10): Promise<User[]> {
    try {
      const currentUser = await db
        .select({ embedding: users.profileEmbedding })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (currentUser.length === 0) return [];
      const embedding = (currentUser[0] as unknown as { embedding?: number[] }).embedding;
      if (!Array.isArray(embedding) || embedding.length === 0) return [];
      const similarRows = await db
        .select({
          user: users,
          similarity: sql<number>`1 - (${cosineDistance(users.profileEmbedding, embedding)})`,
        })
        .from(users)
        .where(
          and(
            sql`${users.profileEmbedding} IS NOT NULL`,
            sql`${users.id} != ${userId}`,
            eq(users.isActive, true),
            isNull(users.deletedAt)
          )
        )
        .orderBy(sql`1 - (${cosineDistance(users.profileEmbedding, embedding)}) DESC`)
        .limit(limit);
      return similarRows.map(r => (r as unknown as { user: User }).user);
    } catch (error: unknown) {
      console.error('Find similar users error:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
}
// ============================================================================
// USER ACTIVITY TRACKING
// ============================================================================
export class UserActivityService {
  /**
   * Log user activity
   */
  static async logActivity(activity: NewUserActivity): Promise<void> {
    try {
      await userDb.insert(userActivityLog).values({
        ...activity,
        timestamp: new Date(),
      });
    } catch (error: unknown) {
      console.error('Log activity error:', error instanceof Error ? error.message : String(error));
    }
  }
  /**
   * Get user activity history
   */
  static async getUserActivity(userId: number, limit: number = 50, offset: number = 0): Promise<UserActivity[]> {
    try {
      return await db
        .select()
        .from(userActivityLog)
        .where(eq(userActivityLog.userId, userId))
        .orderBy(desc(userActivityLog.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error: unknown) {
      console.error('Get user activity error:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
  /**
   * Get activity statistics for user
   */
  static async getActivityStats(userId: number, days: number = 30): Promise<ActivityStats> {
    try {
      const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = (await db
        .select({
          totalActions: count(),
          successRate: sql<number>`AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END)`,
        })
        .from(userActivityLog)
        .where(and(eq(userActivityLog.userId, userId), sql`${userActivityLog.timestamp} >= ${dateThreshold}`))) as StatsRow[];

      const topActionsRaw = (await db
        .select({
          action: userActivityLog.action,
          count: count(),
        })
        .from(userActivityLog)
        .where(and(eq(userActivityLog.userId, userId), sql`${userActivityLog.timestamp} >= ${dateThreshold}`))
        .groupBy(userActivityLog.action)
        .orderBy(desc(count()))
        .limit(10)) as TopActionRow[];

      const uniqueActionsResult = (await db
        .select({
          uniqueActions: sql<number>`COUNT(DISTINCT action)`,
        })
        .from(userActivityLog)
        .where(and(eq(userActivityLog.userId, userId), sql`${userActivityLog.timestamp} >= ${dateThreshold}`))) as UniqueActionsRow[];

      const totalActions = stats && stats[0] ? Number(stats[0].totalActions ?? 0) : 0;
      const successRate = stats && stats[0] ? Number(stats[0].successRate ?? 0) : 0;
      const uniqueActions = uniqueActionsResult && uniqueActionsResult[0] ? Number(uniqueActionsResult[0].uniqueActions ?? 0) : 0;

      const topActions = topActionsRaw.map(r => ({
        action: String(r.action),
        count: Number(r.count ?? 0),
      }));

      return {
        totalActions,
        uniqueActions,
        successRate,
        topActions,
      };
    } catch (error: unknown) {
      console.error('Get activity stats error:', error instanceof Error ? error.message : String(error));
      return {
        totalActions: 0,
        uniqueActions: 0,
        successRate: 0,
        topActions: [],
      };
    }
  }
}
// ============================================================================
// EXPORTS
// ============================================================================
export { userDb as db };
export default {
  UserAuthService,
  UserProfileService,
  UserActivityService,
};