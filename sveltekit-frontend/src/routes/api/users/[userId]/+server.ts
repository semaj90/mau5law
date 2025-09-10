import { users } from '$lib/server/db/schema-postgres';
import { db } from '$lib/server/db/index';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { authService } from '$lib/server/auth';
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const currentUser = locals.user;
    if (!currentUser) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!db) {
      return json({ error: 'Database not available' }, { status: 500 });
    }
    const userId = params.userId;
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }
    // Users can only view their own profile unless they're admin
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Exclude sensitive fields
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    return json(userResult[0]);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return json({ error: 'Failed to fetch user' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const currentUser = locals.user;
    if (!currentUser) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!db) {
      return json({ error: 'Database not available' }, { status: 500 });
    }
    const userId = params.userId;
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }
    // Users can only update their own profile unless they're admin
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const data = await request.json();

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!existingUser.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    // If updating email, check for duplicates
    if (data.email && data.email !== existingUser[0].email) {
      const duplicateUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (duplicateUser.length > 0) {
        return json({ error: 'Email already exists' }, { status: 409 });
      }
    }
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Only update provided fields
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.name !== undefined) updateData.name = data.name?.trim() || null;
    if (data.firstName !== undefined) updateData.firstName = data.firstName?.trim() || null;
    if (data.lastName !== undefined) updateData.lastName = data.lastName?.trim() || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl?.trim() || null;

    // Only admins can change role and active status
    if (currentUser.role === 'admin') {
      if (data.role !== undefined) updateData.role = data.role;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
    }
    // Handle password change using authService
    if (data.password) {
      const argon2id = new (await import('oslo/password')).Argon2id();
      updateData.hashedPassword = await argon2id.hash(data.password);
    }
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return json({ error: 'Failed to update user' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }
    // Only admins can delete users
    if (locals.user.role !== 'admin') {
      return json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    if (!db) {
      return json({ error: 'Database not available' }, { status: 500 });
    }
    const userId = params.userId;
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }
    // Prevent self-deletion
    if (locals.user.id === userId) {
      return json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!existingUser.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    // Delete the user (cascade will handle related records)
    const [deletedUser] = await db.delete(users).where(eq(users.id, userId)).returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

    return json({ success: true, deletedUser });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return json({ error: 'Failed to delete user' }, { status: 500 });
  }
};

// PATCH endpoint for partial updates (like status changes)
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  try {
    const currentUser = locals.user;
    if (!currentUser) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!db) {
      return json({ error: 'Database not available' }, { status: 500 });
    }
    const userId = params.userId;
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }
    const data = await request.json();

    // Users can only update their own profile unless they're admin
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!existingUser.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Handle specific patch operations
    if (data.operation === 'activate' && currentUser.role === 'admin') {
      updateData.isActive = true;
    } else if (data.operation === 'deactivate' && currentUser.role === 'admin') {
      updateData.isActive = false;
    } else if (data.operation === 'changeRole' && currentUser.role === 'admin') {
      updateData.role = data.role;
    } else if (data.operation === 'updateAvatar') {
      updateData.avatarUrl = data.avatarUrl;
    } else if (data.operation === 'updatePassword') {
      if (data.password) {
        const argon2id = new (await import('oslo/password')).Argon2id();
        updateData.hashedPassword = await argon2id.hash(data.password);
      }
    } else if (data.operation === 'updateProfile') {
      if (data.name !== undefined) updateData.name = data.name;
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
    } else {
      // Regular field updates (non-admin users can only update their own basic info)
      Object.keys(data).forEach((key) => {
        if (key !== 'operation') {
          if (currentUser.role === 'admin' || currentUser.id === userId) {
            // Allow basic profile updates for own account
            if (['name', 'firstName', 'lastName', 'avatarUrl'].includes(key)) {
              updateData[key] = data[key];
            } else if (currentUser.role === 'admin') {
              // Admin can update any field
              updateData[key] = data[key];
            }
          }
        }
      });
    }
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return json(updatedUser);
  } catch (error: any) {
    console.error('Error patching user:', error);
    return json({ error: 'Failed to update user' }, { status: 500 });
  }
};
