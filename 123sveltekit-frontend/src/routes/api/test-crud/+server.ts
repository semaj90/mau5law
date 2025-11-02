
/**
 * PostgreSQL CRUD Test Endpoint
 * Tests database connectivity and basic operations
 */

import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET - Test database connection and list users
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Test database connection
    const connectionTest = await db.execute('SELECT 1 as connection_test');
    
    // Get optional limit from query params
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Fetch sample users (without sensitive data)
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        role: users.role,
        is_active: users.is_active,
        created_at: users.created_at
      })
      .from(users)
      .limit(limit);

    return json({
      success: true,
      message: 'PostgreSQL CRUD test successful',
      data: {
        connection_test: connectionTest,
        users: userList,
        count: userList.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('[CRUD Test] Database error:', err);
    
    return json({
      success: false,
      message: 'Database connection failed',
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// POST - Create test user
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, username, first_name, last_name, role = 'user' } = body;

    // Basic validation
    if (!email || !username) {
      error(400, 'Email and username are required');
    }

    // Create test user
    const newUser = await db
      .insert(users)
      .values({
        email,
        username,
        first_name,
        last_name,
        role,
        hashed_password: 'test_password_hash', // In real app, use proper hashing
        is_active: true,
        email_verified: false
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        role: users.role,
        created_at: users.created_at
      });

    return json({
      success: true,
      message: 'User created successfully',
      data: newUser[0],
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (err: any) {
    console.error('[CRUD Test] Create user error:', err);
    
    // Handle unique constraint violations
    if (err.code === '23505') {
      return json({
        success: false,
        message: 'User with this email or username already exists',
        error: err.detail,
        timestamp: new Date().toISOString()
      }, { status: 409 });
    }

    return json({
      success: false,
      message: 'Failed to create user',
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};