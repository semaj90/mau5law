import { SimpleAuthService } from '$lib/server/auth-simple'; // Changed to import the class
import lucia from '$lib/server/auth'; // Changed to a default import
import type { RequestHandler } from './$types.js'; /** * Auto-login endpoint for demo user * POST /auth/login/auto * Uses relay authentication service to avoid direct database timeouts */ export const POST: RequestHandler = async ({ cookies, getClientAddress, request }) => { const clientIP = getClientAddress(); const userAgent = request.headers.get('user-agent') || ''; // Instantiate SimpleAuthService const simpleAuthService = new SimpleAuthService(); try { // Use simple authentication with direct PostgreSQL queries console.log('ðŸ”„ Using simple authentication for demo user...'); // Login with demo credentials const user = await simpleAuthService.authenticateDemoUser(); console.log('âœ… Demo user authenticated: ', user.email); // Create session using Lucia const session = await simpleAuthService.createSession(user.id); // Set session cookie const sessionCookie = lucia.createSessionCookie(session.id); cookies.set(sessionCookie.name, sessionCookie.value, { ...sessionCookie.attributes, path: '/' }); console.log('âœ… Demo user auto-login successful: ', user.email); // Return success response instead of redirect for API endpoint return new Response( JSON.stringify({
                success: true,
                user: {
                    id: user.id, // Corrected property name
                    email: user.email, // Corrected property name
                    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), // Corrected template literal
                    role: user.role
                },
                redirectTo: '/dashboard' // Corrected string literal
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        ); }catch (error: Error | unknown) { console.error('Demo auto-login error: ', error); return new Response( JSON.stringify({ error: `Auto-login failed. Please try manual login.` }), {
            status: 500,
            headers: { 'Content-Type': `application/json` }
        } );
};

