import { lucia } from '$lib/auth/session';
import { db } from '$lib/server/db';
import { users, sessions, userAuditLogs, type User } from '$lib/database/schema';
import * as drizzle from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';
import type { Session } from 'lucia';

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
  requiresVerification?: boolean;
  lockoutUntil?: Date | null;
}

export interface LoginAttempt {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionExpiryDays: number;
  requireEmailVerification: boolean;
  enforcePasswordComplexity: boolean;
  enable2FA: boolean;
}

export class EnhancedAuthService {
  private securitySettings: SecuritySettings = {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionExpiryDays: 30,
    requireEmailVerification: true,
    enforcePasswordComplexity: true,
    enable2FA: false,
  };

  constructor(settings?: Partial<SecuritySettings>) {
    if (settings) this.securitySettings = { ...this.securitySettings, ...settings };
  }

  async login(loginData: LoginAttempt): Promise<AuthResult> {
    try {
      const rows = await db.select().from(users).where(drizzle.eq(users.email, loginData.email.toLowerCase())).limit(1);
      const existingUser = Array.isArray(rows) && rows.length > 0 ? (rows[0] as User) : null;

      if (!existingUser) {
        await this.logAuthEvent({
          userId: null,
          action: 'login_failed',
          ipAddress: loginData.ipAddress,
          userAgent: loginData.userAgent,
          metadata: { email: loginData.email, reason: 'user_not_found' },
        });
        return { success: false, error: 'Invalid email or password' };
      }

      if (existingUser.lockoutUntil && existingUser.lockoutUntil > new Date()) {
        await this.logAuthEvent({
          userId: existingUser.id,
          action: 'login_blocked',
          ipAddress: loginData.ipAddress,
          userAgent: loginData.userAgent,
          metadata: { reason: 'account_locked', lockoutUntil: existingUser.lockoutUntil },
        });
        return {
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts',
          lockoutUntil: existingUser.lockoutUntil,
        };
      }

      if (!existingUser.isActive) return { success: false, error: 'Account is deactivated' };

      const isValidPassword = await bcrypt.compare(loginData.password, existingUser.passwordHash || '');
      if (!isValidPassword) {
        await this.handleFailedLogin(existingUser as User, loginData);
        return { success: false, error: 'Invalid email or password' };
      }

      if (this.securitySettings.requireEmailVerification && !existingUser.emailVerified) {
        return {
          success: false,
          error: 'Please verify your email address before logging in',
          requiresVerification: true,
        };
      }

      await this.resetLoginAttempts(existingUser.id);

      let session = null;
      try {
        // lucia may provide createSession(userId) or createSession({userId}) depending on version; best-effort
        // @ts-ignore
        if (lucia && typeof lucia.createSession === 'function')
          session = (await lucia.createSession) ? await (lucia as any).createSession(existingUser.id) : null;
      } catch (e) {
        session = null;
      }

      await db.update(users).set({ lastLoginAt: new Date() }).where(drizzle.eq(users.id, existingUser.id));
      await this.logAuthEvent({
        userId: existingUser.id,
        action: 'login_success',
        ipAddress: loginData.ipAddress,
        userAgent: loginData.userAgent,
        metadata: { rememberMe: loginData.rememberMe },
      });
      return { success: true, user: existingUser, session };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async register(registerData: RegisterData, request: RequestEvent): Promise<AuthResult> {
    try {
      const { email, password, firstName, lastName, role = 'user' } = registerData;
      const validation = this.validateRegistrationData(registerData);
      if (!validation.isValid) return { success: false, error: validation.error };

      const rows = await db.select().from(users).where(drizzle.eq(users.email, email.toLowerCase())).limit(1);
      const existingUser = Array.isArray(rows) && rows.length > 0 ? (rows[0] as User) : null;
      if (existingUser) return { success: false, error: 'An account with this email already exists' };

      const passwordHash = await bcrypt.hash(password, 12);
      const emailVerificationToken = this.securitySettings.requireEmailVerification
        ? crypto.randomBytes(32).toString('hex')
        : null;

      const inserted = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          role,
          emailVerificationToken,
          isActive: !this.securitySettings.requireEmailVerification,
        })
        .returning();

      const newUser = Array.isArray(inserted) && inserted.length > 0 ? (inserted[0] as User) : null;

      await this.logAuthEvent({
        userId: newUser?.id || null,
        action: 'register_success',
        ipAddress: this.getClientIP(request),
        userAgent: request.request.headers.get('user-agent') || '',
        metadata: { role, requiresVerification: this.securitySettings.requireEmailVerification },
      });

      if (this.securitySettings.requireEmailVerification && emailVerificationToken && newUser) {
        await this.sendVerificationEmail(newUser.email, emailVerificationToken);
        return { success: true, user: newUser, requiresVerification: true };
      }

      let session = null;
      try {
        // @ts-ignore
        if (lucia && typeof lucia.createSession === 'function' && newUser)
          session = (await (lucia as any).createSession) ? await (lucia as any).createSession(newUser.id) : null;
      } catch (e) {
        session = null;
      }

      return { success: true, user: newUser, session };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async logout(sessionId: string, request: RequestEvent): Promise<void> {
    try {
      // @ts-ignore
      if (lucia && typeof lucia.invalidateSession === 'function') {
        // @ts-ignore
        await (lucia as any).invalidateSession(sessionId);
      }
      await this.logAuthEvent({
        userId: null,
        action: 'logout_success',
        ipAddress: this.getClientIP(request),
        userAgent: request.request.headers.get('user-agent') || '',
        metadata: { sessionId },
      });
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  }

  async verifyEmail(token: string): Promise<AuthResult> {
    try {
      const rows = await db
        .select()
        .from(users)
        .where(drizzle.eq((users as any).emailVerificationToken, token))
        .limit(1);
      const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as User) : null;
      if (!user) return { success: false, error: 'Invalid or expired verification token' };
      await db
        .update(users)
        .set({ emailVerified: new Date(), emailVerificationToken: null, isActive: true })
        .where(drizzle.eq(users.id, user.id));
      await this.logAuthEvent({
        userId: user.id,
        action: 'email_verified',
        ipAddress: 'system',
        userAgent: 'system',
        metadata: { token },
      });
      return { success: true, user };
    } catch (error: any) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  async requestPasswordReset(email: string, request: RequestEvent): Promise<any> {
    try {
      const rows = await db.select().from(users).where(drizzle.eq(users.email, email.toLowerCase())).limit(1);
      const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as User) : null;
      if (!user) return { success: true };
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await db
        .update(users)
        .set({ passwordResetToken: resetToken, passwordResetExpires: resetExpires })
        .where(drizzle.eq(users.id, user.id));
      await this.sendPasswordResetEmail(user.email, resetToken);
      await this.logAuthEvent({
        userId: user.id,
        action: 'password_reset_requested',
        ipAddress: this.getClientIP(request),
        userAgent: request.request.headers.get('user-agent') || '',
        metadata: { resetExpires },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Password reset request error:', error);
      return { success: false, error: 'Failed to process password reset request' };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      const rows = await db
        .select()
        .from(users)
        .where(
          drizzle.and(
            drizzle.eq((users as any).passwordResetToken, token),
            drizzle.gte((users as any).passwordResetExpires, new Date())
          )
        )
        .limit(1);
      const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as User) : null;
      if (!user) return { success: false, error: 'Invalid or expired reset token' };
      if (!this.validatePassword(newPassword))
        return { success: false, error: 'Password does not meet security requirements' };
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db
        .update(users)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          loginAttempts: 0,
          lockoutUntil: null,
        })
        .where(drizzle.eq(users.id, user.id));
      await this.logAuthEvent({
        userId: user.id,
        action: 'password_reset_success',
        ipAddress: 'system',
        userAgent: 'system',
        metadata: { token },
      });
      return { success: true, user };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  async getSecuritySummary(userId: string): Promise<any> {
    try {
      const recentLogs = await db
        .select()
        .from(userAuditLogs)
        .where(drizzle.eq(userAuditLogs.userId, userId))
        .orderBy(userAuditLogs.createdAt)
        .limit(10);
      const activeSessions = await db
        .select({ count: drizzle.count() })
        .from(sessions)
        .where(drizzle.and(drizzle.eq(sessions.userId, userId), drizzle.gte(sessions.expiresAt, new Date())));
      return {
        recentActivity: recentLogs,
        activeSessionsCount: activeSessions[0]?.count || 0,
        securitySettings: this.securitySettings,
      };
    } catch (error: any) {
      console.error('Security summary error:', error);
      return null;
    }
  }

  // Private helpers
  private async handleFailedLogin(user: User, loginData: LoginAttempt): Promise<void> {
    const newAttempts = (user as any).loginAttempts ? (user as any).loginAttempts + 1 : 1;
    const lockoutUntil =
      newAttempts >= this.securitySettings.maxLoginAttempts
        ? new Date(Date.now() + this.securitySettings.lockoutDurationMinutes * 60 * 1000)
        : null;
    await db.update(users).set({ loginAttempts: newAttempts, lockoutUntil }).where(drizzle.eq(users.id, user.id));
    await this.logAuthEvent({
      userId: user.id,
      action: 'login_failed',
      ipAddress: loginData.ipAddress,
      userAgent: loginData.userAgent,
      metadata: { attempts: newAttempts },
    });
  }

  private async resetLoginAttempts(userId: string): Promise<void> {
    try {
      await db.update(users).set({ loginAttempts: 0, lockoutUntil: null }).where(drizzle.eq(users.id, userId));
    } catch {
      // ignore
    }
  }

  private async logAuthEvent(entry: {
    userId: string | null;
    action: string;
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
  }) {
    try {
      await db.insert(userAuditLogs).values({
        userId: entry.userId,
        action: entry.action,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata || {},
        createdAt: entry.createdAt || new Date(),
      });
    } catch (e) {
      console.warn('Failed to log auth event', e);
    }
  }

  private validateRegistrationData(data: RegisterData): { isValid: boolean; error?: string } {
    if (!data.email || !data.password || !data.firstName || !data.lastName)
      return { isValid: false, error: 'All fields are required' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { isValid: false, error: 'Invalid email format' };
    if (this.securitySettings.enforcePasswordComplexity && !this.validatePassword(data.password))
      return { isValid: false, error: 'Password does not meet complexity requirements' };
    return { isValid: true };
  }

  private validatePassword(pw: string): boolean {
    if (!pw || pw.length < 8) return false;
    if (!this.securitySettings.enforcePasswordComplexity) return true;
    return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[@$!%*?&]/.test(pw);
  }

  private getClientIP(request: RequestEvent): string {
    try {
      return (
        request.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        (request as any).getClientAddress?.() ||
        'unknown'
      );
    } catch {
      return 'unknown';
    }
  }

  private async sendVerificationEmail(email: string, token: string) {
    console.info(`Send verification email to ${email} token=${token}`);
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    console.info(`Send password reset to ${email} token=${token}`);
  }
}
