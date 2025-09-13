import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { quicAuthClient, setSessionCookie } from '$lib/services/quic-auth-client';
import { db } from '$lib/server/db';
import { sessions as sessionsTable, users as usersTable } from '$lib/server/db/unified-schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/auth/quic-login
 * Authenticate user via QUIC server and sync with Lucia session
 */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Get client info for session tracking
        const ipAddress = getClientAddress();
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Authenticate with QUIC server
        const authResponse = await quicAuthClient.login({
            email,
            password,
            ipAddress,
            userAgent
        });

        if (!authResponse.success || !authResponse.sessionId) {
            return json(
                { success: false, error: authResponse.error || 'Authentication failed' },
                { status: 401 }
            );
        }

        // Check if user exists in local database
        const existingUser = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);

        let userId: string;

        if (existingUser.length === 0 && authResponse.profile) {
            // Create user in local database if doesn't exist
            const newUser = await db
                .insert(usersTable)
                .values({
                    id: authResponse.userId!,
                    email: authResponse.profile.email,
                    password_hash: 'quic_auth', // Placeholder since auth is handled by QUIC
                    first_name: authResponse.profile.firstName,
                    last_name: authResponse.profile.lastName,
                    role: authResponse.profile.role || 'user',
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .returning();

            userId = newUser[0].id;
        } else {
            userId = existingUser[0].id;
        }

        // Store session in local database for SSR compatibility
        const expiresAt = new Date(authResponse.expiresAt!);

        await db.insert(sessionsTable).values({
            id: authResponse.sessionId,
            user_id: userId,
            expires_at: expiresAt,
            ip_address: ipAddress,
            user_agent: userAgent,
            session_context: {
                quic_auth: true,
                access_token: authResponse.accessToken,
                refresh_token: authResponse.refreshToken
            }
        });

        // Set session cookie
        setSessionCookie({ cookies } as any, authResponse.sessionId, expiresAt);

        return json({
            success: true,
            user: {
                id: userId,
                email: authResponse.profile?.email,
                firstName: authResponse.profile?.firstName,
                lastName: authResponse.profile?.lastName,
                role: authResponse.profile?.role
            },
            sessionId: authResponse.sessionId,
            expiresAt: authResponse.expiresAt
        });
    } catch (error) {
        console.error('QUIC login error:', error);
        return json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
};

/**
 * GET /api/auth/quic-login
 * Validate current session with QUIC server
 */
export const GET: RequestHandler = async ({ cookies, getClientAddress }) => {
    try {
        const sessionId = cookies.get('session_id') || cookies.get('session');

        if (!sessionId) {
            return json(
                { valid: false, error: 'No session found' },
                { status: 401 }
            );
        }

        const ipAddress = getClientAddress();
        const userAgent = 'server-validation';

        // Validate with QUIC server
        const validation = await quicAuthClient.validateSession(
            sessionId,
            ipAddress,
            userAgent
        );

        if (!validation.valid) {
            // Clear invalid session from database
            await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));

            return json(
                { valid: false, error: validation.error || 'Invalid session' },
                { status: 401 }
            );
        }

        return json({
            valid: true,
            user: {
                id: validation.userId,
                email: validation.profile?.email,
                firstName: validation.profile?.firstName,
                lastName: validation.profile?.lastName,
                role: validation.profile?.role
            },
            expiresAt: validation.expiresAt
        });
    } catch (error) {
        console.error('QUIC session validation error:', error);
        return json(
            { valid: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
};