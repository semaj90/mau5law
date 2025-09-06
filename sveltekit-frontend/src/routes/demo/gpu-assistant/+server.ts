import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { v4 as uuid } from 'uuid';
import { json } from '@sveltejs/kit';
import { chatSessions, chatMessages } from '$lib/server/db/schema-unified';

const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';
const sql = postgres(connectionString, { max: 5 });
const db = drizzle(sql);

async function ensureSession(): Promise<string> {
  // create a session row and return id
  const id = uuid();
  await db.insert(chatSessions).values({ id });
  return id;
}

async function listMessages(sessionId: string) {
  const rows = await db.select().from(chatMessages).where(chatMessages.sessionId.eq(sessionId)).orderBy(chatMessages.createdAt.asc());
  return rows;
}

async function askOllama(prompt: string, model = 'gemma3-legal'): Promise<string> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.response || '';
  } catch (e) {
    return 'AI service unavailable.';
  }
}

export const GET: RequestHandler = async () => {
  // Return session id (create if missing in a cookie ideally; here simple new)
  const sessionId = await ensureSession();
  const messages = await listMessages(sessionId);
  return json({ sessionId, messages });
};

export const POST: RequestHandler = async ({ request, url }) => {
  const pathname = url.pathname;
  if (pathname.endsWith('/session')) {
    const sessionId = await ensureSession();
    const messages = await listMessages(sessionId);
    return json({ sessionId, messages });
  }

  if (pathname.endsWith('/message')) {
    const body = await request.json();
    const sessionId = body.sessionId || (await ensureSession());
    const content: string = body.content;
    const model: string = body.model || 'gemma3-legal';

    const userMsg = { id: uuid(), sessionId, role: 'user', content } as any;
    await db.insert(chatMessages).values(userMsg);

    const reply = await askOllama(content, model);
    const asstMsg = { id: uuid(), sessionId, role: 'assistant', content: reply } as any;
    await db.insert(chatMessages).values(asstMsg);

    return json({ sessionId, assistant: asstMsg });
  }

  return json({ ok: true });
};
