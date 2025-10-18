import type { RequestHandler } from '@sveltejs/kit';
import { createSSRResponse, createSSRErrorResponse, withSSRHandler, sanitizeForSSR } from '$lib/server/api-ssr-helpers';
import { getTypedLocals } from '$lib/types/locals-unify';
import { db } from '$lib/server/db';
import { users, cases, evidence } from '$lib/server/db/schema-postgres';
import { eq, sql, count } from 'drizzle-orm';
import { cognitiveCache } from '$lib/services/cognitive-cache-integration';
import { dev } from '$app/environment';

/**
 * GET /api/auth/me
 * Returns the current authenticated user (SSR-aware).
 * Uses cognitive cache (when available) and falls back to the database.
 * For development, returns a lightweight mock user when no session exists.
 */
export const GET: RequestHandler = withSSRHandler(async ({ locals, cookies }) => {
  const typedLocals = getTypedLocals(locals);
  const session = typedLocals.session;
  const user = typedLocals.user;

  // Development fallback: return a mock user and set a dev cookie
  if (!session || !user) {
    if (dev) {
      cookies.set('dev_session', `dev_user_session_${Date.now()}`, {
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      const mockUser = {
        user: {
          id: 'dev_user_001',
          email: 'developer@legal-ai.dev',
          username: 'dev_user',
          firstName: 'Development',
          lastName: 'User',
          displayName: 'Development User',
          role: 'attorney',
          department: 'Legal',
          jurisdiction: 'CA',
          practiceAreas: ['corporate', 'litigation'],
          barNumber: 'DEV123456',
          firmName: 'Legal AI Development',
          avatarUrl: null,
          lastLoginAt: new Date().toISOString(),
          permissions: ['read', 'write', 'analyze'],
          isActive: true,
          emailVerified: true,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activity: {
          totalCases: 5,
          activeCases: 2,
          totalEvidence: 15,
        },
        authenticated: true,
        loadSource: 'development',
      };

      // Sanitize mock user before returning (avoid unsafe casts)
      // cast to any at the last moment to satisfy the existing createSSRResponse generic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return createSSRResponse(sanitizeForSSR(mockUser) as unknown as any);
    }

    return createSSRErrorResponse('Not authenticated', 401, { user: null });
  }

  const userId = user.id;
  const cacheKey = `current_user_${userId}`;

  // Try cognitive cache first
  const cachedUserData = await cognitiveCache.retrieveJsonbDocument(cacheKey);
  if (cachedUserData && (cachedUserData.metadata?.accessCount ?? -1) >= 0) {
    // Sanitize cached payload before returning
    const payload = sanitizeForSSR({
      ...cachedUserData.content,
      authenticated: true,
      loadSource: 'cache',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createSSRResponse(payload as unknown as any, { cached: true });
  }

  // Fetch profile + stats from database
  const [userProfileRows, userStatsRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.first_name,
        lastName: users.last_name,
        role: users.role,
        department: users.department,
        jurisdiction: users.jurisdiction,
        practiceAreas: users.practice_areas,
        barNumber: users.bar_number,
        firmName: users.firm_name,
        avatarUrl: users.avatar_url,
        lastLoginAt: users.last_login_at,
        permissions: users.permissions,
        isActive: users.is_active,
        emailVerified: users.email_verified,
        metadata: users.metadata,
        createdAt: users.created_at,
        updatedAt: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        totalCases: count(cases.id),
        // cast to any where necessary during migration shimming
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeCases: sql<number>`COUNT(CASE WHEN ${cases.status} IN ('open', 'active') THEN 1 END)` as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        totalEvidence: sql<number>`(SELECT COUNT(*) FROM ${evidence} WHERE ${evidence.created_by} = ${userId})` as any,
      })
      .from(cases)
      .where(eq(cases.created_by, userId)),
  ]);

  const profile = userProfileRows?.[0];
  const stats = userStatsRows?.[0];

  if (!profile) {
    return createSSRErrorResponse('User not found', 404, { user: null });
  }

  const userData = sanitizeForSSR({
    user: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName:
        profile.firstName && profile.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : profile.username || (profile.email || '').split('@')[0],
      role: profile.role,
      department: profile.department,
      jurisdiction: profile.jurisdiction,
      practiceAreas: profile.practiceAreas || [],
      barNumber: profile.barNumber,
      firmName: profile.firmName,
      avatarUrl: profile.avatarUrl,
      lastLoginAt: profile.lastLoginAt,
      permissions: profile.permissions || [],
      isActive: profile.isActive,
      emailVerified: profile.emailVerified,
      metadata: profile.metadata || {},
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    activity: {
      // Ensure numeric types for counts (DB may return string/BigInt)
      totalCases: Number(stats?.totalCases ?? 0),
      activeCases: Number(stats?.activeCases ?? 0),
      totalEvidence: Number(stats?.totalEvidence ?? 0),
    },
    authenticated: true,
    loadSource: 'database',
  });

  // Cache the user data for future requests
  await cognitiveCache.storeJsonbDocument(cacheKey, userData, {
    documentType: 'user-profile',
    cached: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createSSRResponse(userData as unknown as any);
});
