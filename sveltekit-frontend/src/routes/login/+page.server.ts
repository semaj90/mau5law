import { verifyPassword, createUserSession, setSessionCookie } from '$lib/server/lucia';
import { loginSchema } from '$lib/schemas/auth';
import { db, users, eq } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { JSONSchema7 } from 'json-schema';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types.js';
export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/dashboard');
  }
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
      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, form.data.email),
      });
      if (!user) {
        return message(form, 'Invalid email or password', { status: 400 });
      }
      // Verify password
      const isValid = await verifyPassword(user.password_hash, form.data.password);
      if (!isValid) {
        return message(form, 'Invalid email or password', { status: 400 });
      }
      // Create session
      const { sessionId, expiresAt } = await createUserSession(user.id);
      setSessionCookie(cookies, sessionId, expiresAt);
      // Dev debug: print short session id to server logs for quick verification
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Login] session set: ${sessionId.substring(0, 12)}... for ${user.email}`);
      }
      console.log(`[Login] User ${user.email} logged in successfully`);
      throw redirect(303, '/dashboard');
    } catch (error: any) {
      console.error('[Login] Error:', error);
      if (error instanceof Response) throw error;
      return message(form, 'Login failed. Please try again.', { status: 500 });
    }
  },
};
