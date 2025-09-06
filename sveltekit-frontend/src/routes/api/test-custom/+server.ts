import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FixedDrizzlePostgreSQLAdapter } from '$lib/server/auth/custom-adapter';

export const GET: RequestHandler = async ({ request }) => {
  try {
    console.log("=== CUSTOM ADAPTER TEST ===");
    
    // Test our custom adapter
    const adapter = new FixedDrizzlePostgreSQLAdapter();
    console.log("Custom adapter created successfully");
    
    try {
      const result = await adapter.getSessionAndUser("test-session-id");
      console.log("Custom adapter result:", result);
      
      return json({
        success: true,
        message: 'Custom adapter worked!',
        result: result
      });
    } catch (error: any) {
      console.error("Custom adapter error:", error.message);
      console.error("Custom adapter query:", error.query);
      
      return json({
        success: false,
        error: error.message,
        query: error.query || 'No query available'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("Custom Adapter Test Error:", error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
};