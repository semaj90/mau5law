#!/usr/bin/env node
/**
 * QUIC Development Server Starter - Windows Compatible
 * Loads .env.quic and starts Vite dev server
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Set default environment variables
const defaultEnv = {
  REDIS_PASSWORD: 'redis',
  DATABASE_URL: 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db',
  QUIC_ENABLED: 'true',
  DEV_BYPASS_AUTH: 'true',
  ...process.env
};

// Load .env.quic file if it exists
const envQuicPath = join(rootDir, '.env.quic');
if (existsSync(envQuicPath)) {
  const envContent = readFileSync(envQuicPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        defaultEnv[key.trim()] = value.trim();
      }
    }
  });
  console.log('✅ Loaded .env.quic configuration');
} else {
  console.log('⚠️  .env.quic not found, using default environment');
}

// Start Vite dev server using npx to handle hoisted dependencies
const viteArgs = ['dev', '--port', '5173', '--host', '127.0.0.1'];

console.log('\n🚀 Starting QUIC-enabled development server...');
console.log(`📍 Port: 5173`);
console.log(`🔗 URL: http://127.0.0.1:5173\n`);

const vite = spawn('npx', ['vite', ...viteArgs], {
  stdio: 'inherit',
  env: defaultEnv,
  shell: true,
  cwd: rootDir
});

vite.on('error', (error) => {
  console.error('❌ Failed to start Vite:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down development server...');
  vite.kill('SIGINT');
});

process.on('SIGTERM', () => {
  vite.kill('SIGTERM');
});
