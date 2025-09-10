import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, userProfiles } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';
import { URL } from "url";


export const GET: RequestHandler = async ({ url }) => {
  try {
    const email = url.searchParams.get('email');

    if (!email) {
      return json(
        {
          success: false,
          error: 'Email parameter is required',
        },
        { status: 400 }
      );
    }

    // Get user data
    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

    if (user.length === 0) {
      return json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const userData = user[0];

    // Try to get user profile if available
    let userProfile = null;
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userData.id))
        .limit(1);

      if (profile.length > 0) {
        userProfile = profile[0];
      }
    } catch (profileError) {
      const pe: any = profileError;
      console.log('⚠️ Could not fetch user profile:', pe?.message || String(pe));
    }

    // Remove sensitive data
    const { hashedPassword: _, ...safeUserData } = userData;

    return json({
      success: true,
      user: {
        data: safeUserData,
        profile: userProfile
      }
    });

  } catch (error: any) {
    console.error("❌ Error fetching user info:", error);
    return json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
};