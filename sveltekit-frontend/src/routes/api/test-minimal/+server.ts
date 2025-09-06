import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from '$lib/server/db/drizzle';
import { sessions, users } from '$lib/server/db/lucia-schema';

export const GET: RequestHandler = async ({ request }) => {
  try {
    console.log("=== MINIMAL LUCIA SCHEMA TEST ===");
    
    // Test the adapter with minimal schema
    const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
    console.log("Minimal adapter created successfully");
    
    // Test the JOIN query generation
    try {
      const result = await adapter.getSessionAndUser("test-session-id");
      console.log("Minimal adapter result:", result);
    } catch (error: any) {
      console.error("Minimal adapter error:", error.message);
      console.error("Minimal adapter query:", error.query);
      console.error("Minimal adapter cause:", error.cause?.message);
      
      // Return the exact error details
      return json({
        success: false,
        error: error.message,
        query: error.query,
        cause: error.cause?.message
      }, { status: 500 });
    }
    
    return json({
      success: true,
      message: 'Minimal schema test completed successfully',
    });
    
  } catch (error: any) {
    console.error("Minimal Schema Test Error:", error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
};