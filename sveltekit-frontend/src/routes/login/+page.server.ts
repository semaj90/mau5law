import {
  verifyPassword,
  createUserSession,
  setSessionCookie
} from "$lib/server/lucia";
import { loginSchema } from "$lib/schemas/auth";
import { db, users, eq } from "$lib/server/db";
import { fail, redirect } from "@sveltejs/kit";
import type { JSONSchema7 } from "json-schema";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

// removed: import { URL } from "url";

export const load: PageServerLoad = async ({ locals, url }) => {
  const localsTyped = locals as any as App.Locals;

  // If user is already logged in, redirect to dashboard
  if (localsTyped.user) {
    throw redirect(303, "/dashboard");
  }

  // Registration success banner
  const registered = url.searchParams.get("registered");
  const registrationSuccess =
    registered === "true"
      ? "Account created successfully! You can now sign in."
      : undefined;

  // Initialize SuperForms with schema
  const form = await superValidate(zod(loginSchema));

  return { registrationSuccess, form };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, zod(loginSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { email, password } = form.data;
    const localsTyped = (globalThis as any).__CURRENT_LOCALS__ || ({} as App.Locals);

    try {
      // Find user by email (guard shape because db helper wiring can vary)
      let existingUser: any[] = [];
      try {
        existingUser = await db.select().from(users).where(eq(users.email, email as string)).limit(1);
      } catch (e) {
        console.error('[Login] DB select failed:', e);
        return message(form, 'Login failed (db error). Please try again.', { status: 500 });
      }

      if (!Array.isArray(existingUser) || existingUser.length === 0) {
        return message(form, 'Incorrect email or password', { status: 400 });
      }

      const user = existingUser[0];
      if (!user || !user.hashed_password) {
        return message(form, 'Incorrect email or password', { status: 400 });
      }

      // Check if user is active
      if (!user.is_active) {
        return message(form, "Account is deactivated", { status: 403 });
      }

      // Verify password using custom lucia
      const validPassword = await verifyPassword(user.hashed_password!, password as string);

      if (!validPassword) {
        console.log(`[Login] Password verification failed for ${user.email}`);
        return message(form, "Incorrect email or password", { status: 400 });
      }

      // Create session using custom lucia
      const { sessionId, expiresAt } = await createUserSession(user.id);
      setSessionCookie(cookies, sessionId, expiresAt);

      // Dev debug: print short session id to server logs for quick verification
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Login] session set: ${sessionId.substring(0, 12)}... for ${user.email}`);
      }

      console.log(`[Login] User ${user.email} logged in successfully`);
      throw redirect(303, "/dashboard");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      if (error instanceof Response) throw error;
      return message(form, "Login failed. Please try again.", { status: 500 });
    }
  },
};
