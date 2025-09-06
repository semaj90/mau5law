import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * System Information API
 */

// Dynamic import for server-side os module to prevent browser leakage
// import os from "os";

export const GET: RequestHandler = async () => {
  // Server-side only check to prevent browser polyfill issues
  if (typeof window !== 'undefined') {
    return json({ error: 'This endpoint only works on the server' }, { status: 500 });
  }
  
  try {
    // Import Node.js 'os' module directly (server-only)
    const os = await import('node:os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return json({
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      gpuInfo: 'NVIDIA RTX 3060 12GB', // Would need actual detection
      memoryUsage: `${Math.round(usedMem / 1024 / 1024 / 1024)}GB / ${Math.round(totalMem / 1024 / 1024 / 1024)}GB`,
      nodeVersion: process.version,
      uptime: os.uptime()
    });
  } catch (error) {
    return json({ error: 'Failed to get system information', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
};
