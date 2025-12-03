import { SimpleAuthService } from '$lib/server/auth-simple';
import { createUserSession, setSessionCookie } from '$lib/server/lucia';
import { fail, redirect } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types.js';

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(loginSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await superValidate(request, zod(loginSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const { email, password } = form.data;

			// Authenticate user
			const userRecord = await SimpleAuthService.authenticate(email, password);

			// Create session
			const session = await createUserSession(userRecord.id);

			// Set session cookie
			setSessionCookie(cookies, session.id, userRecord.id, session.expiresAt);

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