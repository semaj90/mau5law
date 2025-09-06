import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from '$lib/server/db/drizzle';
import { sessions, users } from '$lib/server/db/schema-postgres';

export const GET: RequestHandler = async ({ request }) => {
  try {
    console.log("=== LUCIA ADAPTER TEST ===");
    
    // Test the adapter directly
    const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
    console.log("Adapter created successfully");
    
    // Check what tables the adapter has
    console.log("Sessions table:", sessions);
    console.log("Users table:", users);
    
    // Try to call getSessionAndUser with a test session ID
    console.log("Testing adapter.getSessionAndUser...");
    
    try {
      const result = await adapter.getSessionAndUser("test-session-id-that-does-not-exist");
      console.log("Adapter result:", result);
    } catch (error: any) {
      console.error("Adapter error:", error.message);
      console.error("Adapter error query:", error.query);
      console.error("Adapter error cause:", error.cause?.message);
    }
    
    return json({
      success: true,
      message: 'Lucia adapter test completed - check console logs',
    });
    
  } catch (error: any) {
    console.error("Lucia Adapter Test Error:", error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
};