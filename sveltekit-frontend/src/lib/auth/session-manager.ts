// Enhanced Session Management with Redis Integration
// Handles secure session storage, management, and cleanup
import { dev } from '$app/environment';
import { redis } from '$lib/server/redis-service';
import { randomBytes, createHash } from 'crypto';
import type { AuthUser, AuthSession } from './auth-store.js';
import type { UserRole } from './roles.js';
import type { Redis as IORedisClient } from 'ioredis';

export interface SessionData {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  metadata: { [key: string]: any };
}

export interface SessionConfig {
  maxAge: number; // Session duration in milliseconds
  maxInactivity: number; // Max inactivity before session expires
  renewalThreshold: number; // Renew session if less than this time remains
  maxSessionsPerUser: number; // Maximum concurrent sessions per user
  cleanupInterval: number; // Cleanup expired sessions interval
}

const DEFAULT_CONFIG: SessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxInactivity: 30 * 60 * 1000, // 30 minutes
  renewalThreshold: 2 * 60 * 60 * 1000, // 2 hours
  maxSessionsPerUser: 5,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
};

export class SessionManager {
  private static instance: SessionManager | null = null;
  private redisClient: IORedisClient | unknown = null;
  private config: SessionConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<SessionConfig>): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(config);
    }
    return SessionManager.instance;
  }

  /**
   * Initialize Redis connection and session management
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // Use centralized Redis service
      this.redisClient = redis;
      // Some redis clients require connect(); call only if available and not already connected
      if (typeof this.redisClient.connect === 'function') {
        try {
          await this.redisClient.connect();
        } catch (err) {
          // ignore "already connected" style errors
        }
      }
      // Setup error handling
      if (typeof this.redisClient.on === 'function') {
        this.redisClient.on('error', (err: any) => {
          console.error('Redis session store error:', err);
        });
        this.redisClient.on('connect', () => {
          console.log('Redis session store connected');
        });
      }
      // Start cleanup timer
      this.startCleanupTimer();
      this.isInitialized = true;
      console.log('Session manager initialized successfully');
    } catch (error: unknown) {
      console.error('Failed to initialize session manager:', error);
      throw error;
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    user: AuthUser,
    request: {
      ipAddress?: string;
      userAgent?: string;
      deviceFingerprint?: string;
      metadata?: { [key: string]: any };
    } = {}
  ): Promise<SessionData> {
    if (!this.redisClient) {
      throw new Error('Session manager not initialized');
    }
    // Generate session ID
    const sessionId = this.generateSessionId();
    // Create session data
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.maxAge);
    const sessionData: SessionData = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: now,
      expiresAt,
      lastActivity: now,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      deviceFingerprint: request.deviceFingerprint,
      metadata: request.metadata || {},
    };
    // Enforce max sessions per user
    await this.enforceSessionLimits(user.id);
    // Store session in Redis
    const sessionKey = this.getSessionKey(sessionId);
    const userSessionsKey = this.getUserSessionsKey(user.id);
    // Use pipeline for atomic operations
    const pipeline = this.redisClient.multi();
    // Store session data
    pipeline.set(sessionKey, JSON.stringify(sessionData));
    pipeline.expire(sessionKey, Math.ceil(this.config.maxAge / 1000));
    // Add to user's session list
    pipeline.sAdd(userSessionsKey, sessionId);
    pipeline.expire(userSessionsKey, Math.ceil(this.config.maxAge / 1000));
    // Store session activity index
    const activityKey = this.getActivityKey(sessionId);
    pipeline.set(activityKey, now.getTime().toString());
    pipeline.expire(activityKey, Math.ceil(this.config.maxAge / 1000));
    await pipeline.exec();
    console.log(`Session created for user ${user.id}: ${sessionId}`);
    return sessionData;
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.redisClient) {
      throw new Error('Session manager not initialized');
    }
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const data = await this.redisClient.get(sessionKey);
      if (!data || typeof data !== 'string') {
        return null;
      }
      const sessionData: SessionData = JSON.parse(data);
      // Convert date strings back to Date objects
      sessionData.createdAt = new Date(sessionData.createdAt);
      sessionData.expiresAt = new Date(sessionData.expiresAt);
      sessionData.lastActivity = new Date(sessionData.lastActivity);
      // Check if session is expired
      if (this.isSessionExpired(sessionData)) {
        await this.destroySession(sessionId);
        return null;
      }
      return sessionData;
    } catch (error: unknown) {
      console.error('Error getting session:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, metadata?: { [key: string]: any }): Promise<boolean> {
    if (!this.redisClient) {
      throw new Error('Session manager not initialized');
    }
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        return false;
      }
      // Update last activity and metadata
      const now = new Date();
      sessionData.lastActivity = now;
      if (metadata) {
        sessionData.metadata = { ...sessionData.metadata, ...metadata };
      }
      // Check if session should be renewed
      const timeUntilExpiry = sessionData.expiresAt.getTime() - now.getTime();
      if (timeUntilExpiry < this.config.renewalThreshold) {
        sessionData.expiresAt = new Date(now.getTime() + this.config.maxAge);
      }
      // Update in Redis
      const sessionKey = this.getSessionKey(sessionId);
      const activityKey = this.getActivityKey(sessionId);
      const pipeline = this.redisClient.multi();
      pipeline.set(sessionKey, JSON.stringify(sessionData));
      pipeline.expire(sessionKey, Math.ceil(this.config.maxAge / 1000));
      pipeline.set(activityKey, now.getTime().toString());
      pipeline.expire(activityKey, Math.ceil(this.config.maxAge / 1000));
      await pipeline.exec();
      return true;
    } catch (error: unknown) {
      console.error('Error updating session activity:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    if (!this.redisClient) {
      throw new Error('Session manager not initialized');
    }
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        return false;
      }
      const sessionKey = this.getSessionKey(sessionId);
      const userSessionsKey = this.getUserSessionsKey(sessionData.userId);
      const activityKey = this.getActivityKey(sessionId);
      // Remove from Redis
      const pipeline = this.redisClient.multi();
      pipeline.del(sessionKey);
      pipeline.sRem(userSessionsKey, sessionId);
      pipeline.del(activityKey);
      await pipeline.exec();
      console.log(`Session destroyed: ${sessionId}`);
      return true;
    } catch (error: unknown) {
      console.error('Error destroying session:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    if (!this.redisClient) {
      throw new Error('Session manager not initialized');
    }
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redisClient.sMembers(userSessionsKey);
      if (!sessionIds || sessionIds.length === 0) {
        return 0;
      }
      const pipeline = this.redisClient.multi();
      let destroyedCount = 0;
      for (const sessionId of sessionIds) {
        if (exceptSessionId && sessionId === exceptSessionId) {
          continue; // Skip the exception session
        }
        const sessionKey = this.getSessionKey(sessionId);
        const activityKey = this.getActivityKey(sessionId);
        pipeline.del(sessionKey);
        pipeline.del(activityKey);
        pipeline.sRem(userSessionsKey, sessionId);
        destroyedCount++;
      }
      if (destroyedCount > 0) {
        await pipeline.exec();
        console.log(`Destroyed ${destroyedCount} sessions for user ${userId}`);
      }
      return destroyedCount;
    } catch (error: unknown) {
      console.error('Error destroying user sessions:', error instanceof Error ? error.message : error);
      return 0;
    }
  }

  /**
   * Get all active (non-expired) sessions for a user.
   * Note: This method filters out expired sessions and only returns sessions that are currently active.
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    if (!this.redisClient) {
      throw new Error('Session manager not initialized');
    }
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redisClient.sMembers(userSessionsKey);
      if (!sessionIds || sessionIds.length === 0) {
        return [];
      }

      const sessions: SessionData[] = [];
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          if (!this.isSessionExpired(session)) {
            sessions.push(session);
          } else {
            // Optionally destroy expired session if it's found to be expired during retrieval
            await this.destroySession(session.id);
          }
        }
      }
      return sessions;
    } catch (error: unknown) {
      console.error('Error getting user sessions:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Gracefully shutdown the session manager
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    // We don't disconnect from Redis here as it's a shared client.
    console.log('Session manager shut down.');
    this.isInitialized = false;
  }

  // --- Private Helper Methods ---

  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `user:${userId}:sessions`;
  }

  private getActivityKey(sessionId: string): string {
    return `session:${sessionId}:activity`;
  }

  private isSessionExpired(session: SessionData): boolean {
    const now = new Date().getTime();
    const isExpiredByMaxAge = session.expiresAt.getTime() < now;
    const isExpiredByInactivity = now - session.lastActivity.getTime() > this.config.maxInactivity;
    return isExpiredByMaxAge || isExpiredByInactivity;
  }

  private async enforceSessionLimits(userId: string): Promise<void> {
    if (!this.redisClient) return;
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redisClient.sMembers(userSessionsKey);

      if (sessionIds.length < this.config.maxSessionsPerUser) {
        return;
      }

      const sessionsWithActivity = await Promise.all(
        sessionIds.map(async id => {
          const activityKey = this.getActivityKey(id);
          const lastActivity = await this.redisClient.get(activityKey);
          return {
            id,
            lastActivity: lastActivity ? parseInt(lastActivity, 10) : 0,
          };
        })
      );

      sessionsWithActivity.sort((a, b) => a.lastActivity - b.lastActivity);

      const sessionsToRemoveCount = sessionsWithActivity.length - this.config.maxSessionsPerUser + 1;
      if (sessionsToRemoveCount <= 0) return;

      const sessionsToRemove = sessionsWithActivity.slice(0, sessionsToRemoveCount);

      for (const session of sessionsToRemove) {
        await this.destroySession(session.id);
      }
      if (dev) {
        console.log(`Enforced session limits for user ${userId}, removed ${sessionsToRemove.length} sessions.`);
      }
    } catch (error: unknown) {
      console.error(
        `Error enforcing session limits for user ${userId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      if (dev) {
        console.log('Running session cleanup...');
      }
      this.cleanupExpiredSessions().catch(error => {
        console.error('Error during session cleanup:', error);
      });
    }, this.config.cleanupInterval);
    console.log(`Session cleanup timer started, running every ${this.config.cleanupInterval / 1000 / 60} minutes.`);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    if (!this.redisClient) {
      console.warn('Redis client not available for cleanup.');
      return;
    }

    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', 'session:*', 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = this.redisClient.multi();
        let destroyedCount = 0;
        for (const key of keys) {
          const sessionId = key.split(':')[1];
          if (sessionId) {
            const sessionData = await this.getSession(sessionId); // This also checks expiry and destroys if needed
            if (!sessionData) {
              // Session was already destroyed by getSession or was truly expired
              destroyedCount++;
            }
          }
        }
        if (destroyedCount > 0) {
          await pipeline.exec(); // Execute any pending deletions from getSession
          if (dev) {
            console.log(`Cleanup: Processed ${keys.length} session keys, found ${destroyedCount} expired/invalid.`);
          }
        }
      }
    } while (cursor !== '0');
  }
}