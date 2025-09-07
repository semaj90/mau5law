import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
// Use canonical server drizzle + schema-postgres to avoid mixed column naming
import { db } from '$lib/server/db/drizzle';
import { users, sessions, cases } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

/*
 * Development Authentication Endpoint
 * GET  -> create / ensure dev session (optional ?seed=true)
 * POST -> clear session
 */

async function findOrCreateDevUser(): Promise<{ id: string; created: boolean; passwordColumn: string; }> {
  // Attempt fetch existing dev user
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, 'dev@example.com')).limit(1);
  if (existing.length) return { id: existing[0].id, created: false, passwordColumn: 'hashed_password' };

  // Fallback: any admin user
  const anyAdmin = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  if (anyAdmin.length) return { id: anyAdmin[0].id, created: false, passwordColumn: 'hashed_password' };

  // Create dev user
  const inserted = await db.insert(users).values({
    email: 'dev@example.com',
    hashed_password: 'dev-hash',
    role: 'admin',
    is_active: true,
    metadata: { theme: 'dev' }
  }).returning({ id: users.id });
  if (!inserted.length) throw new Error('Failed to create dev user');
  return { id: inserted[0].id, created: true, passwordColumn: 'password_hash' };
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  if (!dev) return json({ error: 'Not available in production' }, { status: 403 });
  const seed = url.searchParams.get('seed') === 'true';
  try {
    const userInfo = await findOrCreateDevUser();

    if (seed) {
      try {
        // Insert a realistic sample case if none exist for this user
        const existingCases = await db.select({ id: cases.id }).from(cases).limit(1);
        if (!existingCases.length) {
          await db.insert(cases).values({
            title: 'Sample Investigative Case',
            description: 'Demonstration case seeded in development environment for UI & API testing.',
            priority: 'medium',
            status: 'open'
          });
        }
      } catch (e) {
        logger.warn('dev-auth.seed.failed', { error: (e as Error).message });
      }
    }

    // Create or refresh session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8);
    await db.insert(sessions).values({
      id: sessionId,
      user_id: userInfo.id,
      expires_at: expiresAt
    }).onConflictDoUpdate({ target: sessions.id, set: { expires_at: expiresAt } });

    cookies.set('session', sessionId, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 8 });
    logger.info('dev-auth.session.created', { userId: userInfo.id, sessionId, seed, createdUser: userInfo.created });
    return json({ success: true, user: { id: userInfo.id, email: 'dev@example.com' }, sessionId, expires: expiresAt.toISOString(), seeded: seed, createdUser: userInfo.created });
  } catch (error) {
    logger.error('dev-auth.error', error);
    return json({ error: 'Failed to create development session', details: error instanceof Error ? error.message : 'Unknown error', stack: dev && error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ cookies }) => {
  if (!dev) return json({ error: 'Not available in production' }, { status: 403 });
  const sessionId = cookies.get('session');
  cookies.delete('session', { path: '/' });
  if (sessionId) {
    try {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    } catch {/* ignore */}
    logger.info('dev-auth.session.cleared', { sessionId });
  }
  return json({ success: true, message: 'Development session cleared' });
};