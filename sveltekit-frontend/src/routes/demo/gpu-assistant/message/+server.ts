import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { chatMessages } from '$lib/server/db/schema-unified';

const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';
const sql = postgres(connectionString, { max: 5 });
const db = drizzle(sql);

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

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const sessionId: string = body.sessionId;
  const content: string = body.content;
  const model: string = body.model || 'gemma3-legal';

  if (!sessionId) return json({ error: 'sessionId required' }, { status: 400 });

  const userMsg = { id: randomUUID(), sessionId, role: 'user', content } as any;
  await db.insert(chatMessages).values(userMsg);

  const reply = await askOllama(content, model);
  const asstMsg = { id: randomUUID(), sessionId, role: 'assistant', content: reply } as any;
  await db.insert(chatMessages).values(asstMsg);

  return json({ assistant: asstMsg });
};
