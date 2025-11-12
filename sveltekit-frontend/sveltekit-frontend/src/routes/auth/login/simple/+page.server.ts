import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { SimpleAuthService } from '$lib/server/auth-simple';
import { createUserSession, setSessionCookie } from '$lib/server/lucia';

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

export const load: PageServerLoad = async () => {
	// cast to any to avoid adapter typing mismatch
	const form = await superValidate((zod(loginSchema) as unknown) as any);
	return { form };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		// cast to any to avoid adapter typing mismatch
		const form = await superValidate(request, (zod(loginSchema) as unknown) as any);
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const { email, password } = form.data as { email: string; password: string };

			// Authenticate user (cast service to any if TS types differ)
			const userRecord = await (SimpleAuthService as unknown as any).authenticate(email, password);

			// Create session (cast return type to any to access expected props)
			const session = await (createUserSession as unknown as any)(userRecord.id);

			// Set session cookie - tolerate different session property names via fallback
			const sessionId = (session as any).id ?? (session as any).sessionId ?? '';
			const expiresAt = (session as any).expiresAt ?? (session as any).expires ?? undefined;
			setSessionCookie(cookies, sessionId, userRecord.id, expiresAt);

			console.log('✅ Session created successfully for: ', userRecord.email);
		} catch (error: Error | unknown) {
			console.error('Login error with auth service: ', error);
			const errorMessage = (error as Error).message ?? String(error);

			// Specific common errors
			if (
				errorMessage.includes('Invalid email or password') ||
				errorMessage.includes('Account is deactivated')
			) {
				return fail(400, {
					form: {
						...(form as any),
						errors: { email: [errorMessage] },
					},
				});
			}

			return fail(500, {
				form: {
					...(form as any),
					errors: { email: ['An error occurred during login. Please try again.'] },
				},
			});
		}

		// Redirect to dashboard or intended page
		throw redirect(302, '/dashboard');
	},
};