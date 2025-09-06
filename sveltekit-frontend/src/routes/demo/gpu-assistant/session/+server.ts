import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { chatSessions, chatMessages } from '$lib/server/db/schema-unified';
import { helpers } from '$lib/server/db';

const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';
const sql = postgres(connectionString, { max: 5 });
const db = drizzle(sql);

export const GET: RequestHandler = async () => {
  const id = randomUUID();
  await db.insert(chatSessions).values({ id });
  const messages = await db.select().from(chatMessages)
    .where(helpers.eq ? helpers.eq(chatMessages.sessionId, id) : undefined)
    .orderBy(helpers.asc ? helpers.asc(chatMessages.createdAt) : undefined);
  return json({ sessionId: id, messages });
};

export const POST: RequestHandler = async () => {
  const id = randomUUID();
  await db.insert(chatSessions).values({ id });
  const messages = await db.select().from(chatMessages)
    .where(helpers.eq ? helpers.eq(chatMessages.sessionId, id) : undefined)
    .orderBy(helpers.asc ? helpers.asc(chatMessages.createdAt) : undefined);
  return json({ sessionId: id, messages });
};
