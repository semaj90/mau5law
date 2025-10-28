import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id;
  try {
    const { db } = await import('$lib/server/db/client');
    const { cases } = await import('$lib/server/db/schema-postgres');
    const [row] = await db.select().from(cases).where(cases.id.eq(id));
    return json(row ?? null);
  } catch (err) {
    console.warn('Drizzle GET /api/cases/[id] failed', err);
    return json(null, { status: 404 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = params.id;
  try {
    const { db } = await import('$lib/server/db/client');
    const { cases } = await import('$lib/server/db/schema-postgres');
    await db.delete(cases).where(cases.id.eq(id));
    return json({ success: true });
  } catch (err) {
    console.warn('Drizzle DELETE /api/cases/[id] failed', err);
    return json({ error: 'delete failed' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  const id = params.id;
  const body = await request.json();
  // simple action router: analyze | report
  if (body.action === 'analyze') {
    // enqueue or trigger analysis here; keep minimal for now
    // In production you'd push to RabbitMQ / background worker
    return json({ status: 'analysis_enqueued', progress: 5 });
  }
  if (body.action === 'report') {
    // trigger report generation (async) - return quick ack
    return json({ status: 'report_generation_started' });
  }
  return json({ error: 'unknown action' }, { status: 400 });
};
