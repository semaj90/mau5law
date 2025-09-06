import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const ocrBase = process.env.OCR_SERVICE_URL || 'http://localhost:8601';
  try {
    const r = await fetch(`${ocrBase}/health`);
    if (!r.ok) throw new Error('upstream not ok');
    const upstream = await r.json();
    return new Response(JSON.stringify({ success: true, data: upstream }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, message: 'OCR service unreachable', error: e.message }), { status: 502 });
  }
};
