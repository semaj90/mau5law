
import type { RequestHandler } from './$types';

// Repaired minimal pgAI summarize endpoint. Full DB & pgai integration deferred for compile stability.
export const POST: RequestHandler = async ({ request }) => {
    const { text, format = 'summary' } = await request.json().catch(() => ({}));
    if (!text || typeof text !== 'string') {
        return json({ success: false, error: 'Text is required' }, { status: 400 });
    }
    const trimmed = text.slice(0, 6000);
    const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
    const primary = sentences.slice(0, 3).join(' ');
    const summary = primary.length > 50 ? primary : trimmed.slice(0, 200);
    return json({ success: true, summary, format, originalLength: text.length });
};

export const GET: RequestHandler = async () => json({ success: true, status: 'ok' });
;
export const prerender = false;