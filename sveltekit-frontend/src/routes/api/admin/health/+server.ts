
import type { RequestHandler } from './$types';

/*
 * System Health API Endpoint
 */

import { json } from "@sveltejs/kit";
import { rateLimitAPI } from "$lib/server/monitoring/security";

export const GET: RequestHandler = async (event) => {
  try {
    const { locals, request } = event;
    // Security check - admin only
    if (!locals.user || locals.user.role !== "admin") {
      return json({ error: "Unauthorized" }, { status: 403 });
    }
    // Apply rate limiting
    await rateLimitAPI()(event as any);

    // Get system health metrics
    const healthData = {
      cpu: Math.floor(Math.random() * 80) + 10, // Simulated - replace with actual CPU monitoring
      memory: Math.floor(Math.random() * 70) + 20, // Simulated - replace with actual memory monitoring
      database: "healthy" as const, // Check actual database connection
      storage: Math.floor(Math.random() * 60) + 15, // Simulated - replace with actual disk usage
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    return json({
      success: true,
      data: healthData,
    });
  } catch (error: any) {
    console.error("Health API error:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch health data",
        data: {
          cpu: 0,
          memory: 0,
          database: "error" as const,
          storage: 0,
          uptime: 0,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
};
