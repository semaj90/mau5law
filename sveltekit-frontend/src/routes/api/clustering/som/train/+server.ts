import type { RequestHandler } from './$types';

/*
 * SvelteKit 2 API Route: SOM Training
 * POST /api/clustering/som/train
 */

import { json } from "@sveltejs/kit";
import { LegalDocumentSOM } from "$lib/services/som-clustering";
import { createRedisInstance } from '$lib/server/redis';
import { legalDocuments } from '$lib/server/db/schema-postgres';
import { URL } from 'url';
// Optional amqp for message queue integration

// Centralized Redis instance
const redis = createRedisInstance();

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  // placeholder: enqueue training job
  await (redis as any).rpush('som:train:queue', JSON.stringify(body));
  return json({ ok: true });
};