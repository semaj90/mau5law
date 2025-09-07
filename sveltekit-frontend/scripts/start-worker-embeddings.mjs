#!/usr/bin/env node
/*
 Cross-platform starter for the embeddings queue worker.
 - Loads .env if present
 - Sets DATABASE_URL if not already set
 - Spawns `npm run worker:embeddings`
 Works on Windows PowerShell/CMD and Unix shells.
*/
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Load .env if present (local only)
try {
  const envPath = resolve(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }
} catch {}

// Ensure DATABASE_URL exists (fallback to example if missing)
const defaultDb = 'postgresql://postgres:123456@localhost:5432/legal_ai_db';
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = defaultDb;

// Disable simdjson native addon attempts by default
if (!process.env.SIMDJSON_DISABLED) process.env.SIMDJSON_DISABLED = '1';

const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'worker:embeddings'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
