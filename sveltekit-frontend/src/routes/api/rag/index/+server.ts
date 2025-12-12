// src/routes/api/rag/index/+server.ts

import { json } from '@sveltejs/kit';

export async function POST() {
  // This is a safe stub for the indexing trigger endpoint
  // In production, this should either:
  // 1. Require authentication/authorization
  // 2. Enqueue a background job instead of running synchronously
  // 3. Be disabled entirely and use CLI/script-based indexing

  return json({
    ok: true,
    message: 'Index route is wired. For safety, indexing should be triggered via CLI or with proper auth + job queue.',
    suggestion: 'Use: npx tsx ../scripts/index-lawpdfs-to-rag.ts',
  });
}