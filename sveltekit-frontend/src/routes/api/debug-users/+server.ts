import type { RequestHandler } from './$types';

// Debug endpoint to check and create users
import { json } from "@sveltejs/kit";

import { users } from "$lib/server/db/schema-postgres";

import { eq } from 'drizzle-orm';

export async function GET(): Promise<any> {
  try {
    // Check if users exist
    const existingUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      hasPassword: users.hashedPassword
    }).from(users);

    return json({
      success: true,
      users: existingUsers,
      count: existingUsers.length
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(): Promise<any> {
  try {
    // Update existing users with proper password hashes
    const adminHash = await hashPassword('admin123');
    const testHash = await hashPassword('test123');

    // Update admin@legal.ai
    const updatedAdmin = await db.update(users)
      .set({ hashedPassword: adminHash })
      .where(eq(users.email, 'admin@legal.ai'))
      .returning({ id: users.id, email: users.email, role: users.role });

    // Update test@legal.ai  
    const updatedTest = await db.update(users)
      .set({ hashedPassword: testHash })
      .where(eq(users.email, 'test@legal.ai'))
      .returning({ id: users.id, email: users.email, role: users.role });

    return json({
      success: true,
      message: 'Demo users updated with proper passwords',
      users: [...updatedAdmin, ...updatedTest]
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}