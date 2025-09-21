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
import type { Actions, PageServerLoad } from './$types.js';

// removed: import { URL } from "url";

export // Melt UI component creation removed - replace with bits-ui declarative components
      setSessionCookie(cookies, sessionId, expiresAt);

      // Dev debug: print short session id to server logs for quick verification;
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
  }
};
