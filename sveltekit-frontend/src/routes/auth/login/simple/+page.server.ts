import type { PageServerLoad, Actions } from './$types // TODO: Verify store subscription is correct for Svelte 5.js';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { authenticate } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/auth-simple'; // Changed to named import
import { createUserSession, setSessionCookie } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/lucia';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const load: PageServerLoad = async () => {
  const form = await superValidate(loginSchema, { validators: zod(loginSchema) }); // Corrected superValidate usage
  return { form };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, loginSchema, { validators: zod(loginSchema) }); // Corrected superValidate usage
    if (!form.valid) {
      return fail(400, { form });
    }
    try {
      const { email, password } = form.data;
      // Authenticate user
      const userRecord = await authenticate(email, password);
      // Create session
      const sessionResult = await createUserSession(userRecord.id);
      // Set session cookie
      setSessionCookie(cookies, sessionResult.sessionId); // Corrected setSessionCookie arguments
      console.log('✅ Session created successfully for: ', userRecord.email);
    } catch (error: Error | unknown) {
      console.error('Login error with PostgreSQL auth: ', error);
      const errorMessage = (error as Error).message;
      if (
        errorMessage.includes('Invalid email or password') ||
        errorMessage.includes('Account is deactivated')
      ) {
        return fail(400, { form: { ...form, errors: { email: [errorMessage] } } });
      }
      return fail(500, {
        form: { ...form, errors: { email: ['An error occurred during login. Please try again.'] } },
      });
    }
    throw redirect(302, '/dashboard');
  },
};
