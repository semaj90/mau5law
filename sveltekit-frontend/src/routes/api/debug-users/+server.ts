import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5.js';
import { json } from '@sveltejs/kit';
import { users } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/auth';
import { db } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db';

export async function GET(): Promise<any> {
  try {
    // Check if users exist
    const existingUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        hasPassword: users.hashedPassword
      })
      .from(users);

    return json({
      success: true,
      users: existingUsers,
      count: existingUsers.length
    });
  } catch (error: Error | unknown) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<any> {
  try {
    // Update existing users with proper password hashes
    const adminHash = await hashPassword('admin123');
    const testHash = await hashPassword('test123');

    // Update admin@legal.ai
    const updatedAdmin = await db
      .update(users)
      .set({ hashedPassword: adminHash })
      .where(eq(users.email, 'admin@legal.ai'))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role
      });

    // Update test@legal.ai
    const updatedTest = await db
      .update(users)
      .set({ hashedPassword: testHash })
      .where(eq(users.email, 'test@legal.ai'))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role
      });

    return json({
      success: true,
      message: 'Demo users updated with proper passwords',
      users: [...updatedAdmin, ...updatedTest]
    });
  } catch (error: Error | unknown) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

