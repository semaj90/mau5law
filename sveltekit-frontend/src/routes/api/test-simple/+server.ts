

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString()
  });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    return json({
      success: true,
      message: 'POST request received',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return json({
      success: false,
      error: 'Failed to parse request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
};