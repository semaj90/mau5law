#!/usr/bin/env tsx
// Cross-platform worker starter: sets env and launches the embeddings worker
import { spawn } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd();
const workerPath = path.join(cwd, 'src', 'lib', 'workers', 'queue-worker.ts');

// Env defaults
process.env.SIMDJSON_DISABLED = process.env.SIMDJSON_DISABLED ?? '1';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '4005';
if (!process.env.DATABASE_URL) {
  // Prefer runtime safe user
  process.env.DATABASE_URL = 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';
}

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', workerPath], {
  stdio: 'inherit',
  env: process.env,
  cwd,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
