import { and, eq, gte } from 'drizzle-orm';
// Modern server-managed session authentication utilities (no external Lucia runtime)
import { db } from '$lib/server/db';
// sessions/users live in schema-postgres which are re-exported; import explicitly to avoid type issues
import { sessions as sessionsTable, users as usersTable } from '$lib/server/db/unified-schema';
import bcrypt from "bcryptjs";
// Dynamic import for server-side crypto to prevent browser leakage
// import { randomBytes } from "crypto";

// --- Helper Functions ---
async function generateId(length: number = 40): Promise<string> {
  const { randomBytes } = await import("crypto");
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

function createDate(timeSpan: { days: number }): Date {
  const date = new Date();
  date.setDate(date.getDate() + timeSpan.days);
  return date;
}

// --- Password Hashing ---
export async function hashPassword(password: string): Promise<string> {
  // Use bcrypt for strong password hashing
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(
  hashedPassword: string,
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// --- Session Management ---
export async function createUserSession(
  userId: string,
  days = 30,
  ipAddress?: string,
  userAgent?: string
): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = await generateId(40);
  const expiresAt = createDate({ days });
  await db.insert(sessionsTable).values({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent,
    session_context: {},
  });
  return { sessionId, expiresAt };
}

export async function validateSession(sessionId: string): Promise<any> {
  const now = new Date();
  const session = await (db as any).query.sessions.findFirst({
    where: and(eq((sessionsTable as any).id, sessionId), gte((sessionsTable as any).expires_at, now)),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      },
    },
  });
  if (session && session.user) {
    const { user, ...rest } = session;
    return {
      session: rest,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    };
  }
  return { session: null, user: null };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessionsTable).where(eq((sessionsTable as any).id, sessionId));
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.delete(sessionsTable).where(eq((sessionsTable as any).user_id, userId));
}

// --- Cookie Helper Functions ---
export function setSessionCookie(
  cookies: any,
  sessionId: string,
  expiresAt: Date
): void {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Secure cookie options following security best practices
  const cookieOptions = {
    path: "/",
    httpOnly: true,        // Prevents JavaScript access - server-side only
    secure: isProduction,  // HTTPS only in production, omitted for localhost
    sameSite: "lax" as const,  // Use "strict" for critical applications
    expires: expiresAt,    // Set expiration date
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000) // Seconds until expiry
  };

  // Primary cookie name (recommended for new code)
  cookies.set("session_id", sessionId, cookieOptions);

  // Legacy compatibility cookie for existing code
  // This ensures backward compatibility during development
  try {
    cookies.set("session", sessionId, cookieOptions);
  } catch (error) {
    console.warn("Failed to set legacy session cookie:", error);
  }
}

// Delete session cookie with proper cleanup
export function deleteSessionCookie(cookies: any): void {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Options for clearing cookies (must match the original cookie attributes)
  const clearOptions = {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 0  // Immediately expire
  };

  // Clear both primary and legacy session cookies
  cookies.set("session_id", "", clearOptions);
  cookies.set("session", "", clearOptions);
  
  // Also try delete method as fallback
  cookies.delete("session_id", { path: "/" });
  cookies.delete("session", { path: "/" });
}

// Alias for backward compatibility
export const clearSessionCookie = deleteSessionCookie;
