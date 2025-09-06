import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  try {
    // Direct test of database connection and schema
    const { db } = await import('$lib/server/db/drizzle');
    const { users, sessions } = await import('$lib/server/db/schema-postgres');
    
    // Test basic database connection
    await db.execute('SELECT 1 as test');
    
    // Test schema inspection
    const userSchema = users._.config;
    const sessionSchema = sessions._.config;
    
    // Test simple queries
    const userCount = await db.select({ count: db.sql`count(*)` }).from(users);
    const sessionCount = await db.select({ count: db.sql`count(*)` }).from(sessions);
    
    return json({
      success: true,
      message: 'Database connection and schema test successful',
      tests: {
        connection: 'OK',
        userSchema: {
          tableName: userSchema.name,
          columns: Object.keys(userSchema.columns)
        },
        sessionSchema: {
          tableName: sessionSchema.name,
          columns: Object.keys(sessionSchema.columns)
        },
        counts: {
          users: userCount[0]?.count || 0,
          sessions: sessionCount[0]?.count || 0
        }
      }
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: {
        name: error.name,
        code: error.code || 'NO_CODE',
        cause: error.cause?.message || 'No cause'
      }
    }, { status: 500 });
  }
};