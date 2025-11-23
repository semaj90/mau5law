import type { SimpleAuthService  } from '$lib/server/auth-simple';
import type { lucia  } from '$lib/server/auth'; // Changed to a named import
import type { RequestHandler } from './$types .js';
import type { SimpleAuthService } from '$lib/server/auth-simple';
import type { lucia } from '$lib/server/auth';
import type { RequestHandler } from './$types.js';

// Define the User interface for type safety
interface User {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
}

// Locally define the expected methods for SimpleAuthService to satisfy type checker.
// The actual SimpleAuthService class in '$lib/server/auth-simple' must implement these methods.
// interface ISimpleAuthService {
//     authenticateDemoUser(): Promise<User>;
// }

/** * Auto-login endpoint for demo user * POST /auth/login/auto * Uses relay authentication service to avoid direct database timeouts */
/** Auto-login endpoint for demo user * POST /auth/login/auto * Uses relay authentication service to avoid direct database timeouts */
export const POST: RequestHandler = async ({ cookies, getClientAddress, request }) => {
    // const clientIP = getClientAddress(); // Removed: 'clientIP' is assigned a value but never used.
    // const userAgent = request.headers.get('user-agent') || ''; // Removed: 'userAgent' is assigned a value but never used.

    // Instantiate SimpleAuthService
    const simpleAuthService = new SimpleAuthService(); // Removed ISimpleAuthService interface and type assertion

    const simpleAuthService = new SimpleAuthService();
    try {
        // Login with demo credentials
        const user: User = await simpleAuthService.authenticateDemoUser();
        console.log('âœ… Demo user authenticated: ', user.email);
        console.log('✅ Demo user authenticated: ', user.email);

        // Create session using Lucia (corrected to use lucia directly with attributes)
        // Create session using Lucia
        const session = await lucia.createSession(user.id, {});

        // Set session cookie
        const sessionCookie = lucia.createSessionCookie(session.id);
        cookies.set(sessionCookie.name, sessionCookie.value, { ...sessionCookie.attributes, path: '/' });

        console.log('âœ… Demo user auto-login successful: ', user.email);
        console.log('✅ Demo user auto-login successful: ', user.email);

        // Return success response instead of redirect for API endpoint
        return new Response(
            JSON.stringify({
                success: true,
                user: {
                    id: user.id, // Corrected property name
                    email: user.email, // Corrected property name
                    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), // Corrected template literal
                    id: user.id,
                    email: user.email,
                    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                    role: user.role
                },
                redirectTo: '/dashboard' // Corrected string literal
                redirectTo: '/dashboard'
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error: Error | unknown) {
        console.error('Demo auto-login error: ', error);
        return new Response(JSON.stringify({ error: `Auto-login failed. Please try manual login.` }), {
        return new Response(JSON.stringify({ error: 'Auto-login failed. Please try manual login.' }), {
            status: 500,
            headers: { 'Content-Type': `application/json` }
            headers: { 'Content-Type': 'application/json' }
        });
    } // Added missing closing brace for the POST function
    }
};


