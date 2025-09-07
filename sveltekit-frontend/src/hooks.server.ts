// src/hooks.server.ts - SvelteKit hooks for Lucia v3 authentication
import { lucia } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	// Extract session ID from cookies
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// Validate the session
	const { session, user } = await lucia.validateSession(sessionId);
	
	// If session is fresh, set new session cookie
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: "/",
			...sessionCookie.attributes
		});
	}
	
	// If session is invalid, clear the session cookie
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: "/",
			...sessionCookie.attributes
		});
	}

	// Attach user and session to locals for use in load functions and routes
	event.locals.user = user ? {
		id: user.id,
		email: user.email,
		role: (user as any).role || 'user' as const
	} : null;
	event.locals.session = session;
	
	return resolve(event);
};