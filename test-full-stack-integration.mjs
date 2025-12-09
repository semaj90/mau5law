#!/usr/bin/env node

/**
 * Full Stack Integration Test
 * Tests Phase 14 + GPU Phase 72 + Infrastructure
 *
 * Services tested:
 * - SvelteKit Frontend (5173)
 * - Go Legal Engine (8080)
 * - Phase 72 Ingest Service (8089)
 * - PostgreSQL (5432)
 * - Redis (6379)
 * - Qdrant (6333)
 * - MinIO (9000)
 * - Ollama (11434)
 * - RabbitMQ (5672)
 */

import http from 'http';
import https from 'https';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('🧪 Full Stack Integration Tests\n');
  console.log('═'.repeat(60));

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${err.message}`);
      failed++;
    }
  }

  console.log('═'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Full stack is operational.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check services.\n`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Frontend Tests
// ─────────────────────────────────────────────────────────────────────

test('Frontend: Home page loads', async () => {
  const res = await request('http://127.0.0.1:5173/');
  if (res.status !== 200) throw new Error(`Status ${res.status}`);
  if (!res.data.includes('html')) throw new Error('Invalid HTML response');
});

test('Frontend: Login page accessible', async () => {
  const res = await request('http://127.0.0.1:5173/login');
  if (res.status !== 200) throw new Error(`Status ${res.status}`);
});

// ─────────────────────────────────────────────────────────────────────
// Go Services Tests
// ─────────────────────────────────────────────────────────────────────

test('Go Legal Engine: gRPC server running', async () => {
  // gRPC uses HTTP/2, so we check if port is open
  const res = await request('http://localhost:8080/');
  // gRPC will return 404 for HTTP/1.1 requests, but port is open
  if (res.status === undefined) throw new Error('Port not responding');
});

test('Phase 72 Ingest Service: Running on 8089', async () => {
  const res = await request('http://localhost:8089/health');
  // Service may not have /health endpoint, but port should be open
  if (res.status === undefined) throw new Error('Port not responding');
});

// ─────────────────────────────────────────────────────────────────────
// Infrastructure Tests
// ─────────────────────────────────────────────────────────────────────

test('PostgreSQL: Docker container running', async () => {
  // Check if port is open
  const res = await request('http://localhost:5432/');
  // PostgreSQL will reject HTTP, but port should be open
  if (res.status === undefined) throw new Error('Port not responding');
});

test('Redis: Docker container running', async () => {
  const res = await request('http://localhost:6379/');
  // Redis will reject HTTP, but port should be open
  if (res.status === undefined) throw new Error('Port not responding');
});

test('Qdrant: Vector DB health check', async () => {
  const res = await request('http://localhost:6333/health');
  if (res.status !== 200) throw new Error(`Status ${res.status}`);
  const data = JSON.parse(res.data);
  if (!data.status) throw new Error('Qdrant unhealthy');
});

test('MinIO: Object storage running', async () => {
  const res = await request('http://localhost:9000/minio/health/live');
  if (res.status !== 200) throw new Error(`Status ${res.status}`);
});

test('Ollama: LLM service running', async () => {
  const res = await request('http://localhost:11434/api/tags');
  if (res.status !== 200) throw new Error(`Status ${res.status}`);
  const data = JSON.parse(res.data);
  if (!data.models) throw new Error('No models available');
});

test('RabbitMQ: Message broker running', async () => {
  const res = await request('http://localhost:15672/api/overview', {
    headers: { Authorization: 'Basic Z3Vlc3Q6Z3Vlc3Q=' }, // guest:guest
  });
  if (res.status !== 200) throw new Error(`Status ${res.status}`);
});

// ─────────────────────────────────────────────────────────────────────
// Phase 14 Environment Tests
// ─────────────────────────────────────────────────────────────────────

test('Phase 14: Environment variables synced', async () => {
  // Check if .env file exists and has Phase 14 markers
  const fs = await import('fs');
  const envPath = 'sveltekit-frontend/.env';
  if (!fs.existsSync(envPath)) throw new Error('.env file not found');
  const content = fs.readFileSync(envPath, 'utf-8');
  if (!content.includes('PHASE 14 MASTER ENV')) throw new Error('Phase 14 env not synced');
});

test('Phase 14: Auth configured', async () => {
  const fs = await import('fs');
  const envPath = 'sveltekit-frontend/.env';
  const content = fs.readFileSync(envPath, 'utf-8');
  if (!content.includes('AUTH_COOKIE_NAME=yorha_session')) throw new Error('Auth not configured');
  if (!content.includes('AUTH_SECRET=')) throw new Error('Auth secret missing');
});

// ─────────────────────────────────────────────────────────────────────
// GPU Phase 72 Tests
// ─────────────────────────────────────────────────────────────────────

test('GPU Phase 72: Addon built', async () => {
  const fs = await import('fs');
  const addonPath = 'sveltekit-frontend/build/Release/ast_error_vectorizer.node';
  if (!fs.existsSync(addonPath)) throw new Error('GPU addon not found');
});

test('GPU Phase 72: Wrapper files exist', async () => {
  const fs = await import('fs');
  const files = [
    'sveltekit-frontend/src/lib/server/phase72/astVectorizer.ts',
    'sveltekit-frontend/src/lib/server/phase72/vectorizeErrors.ts',
    'sveltekit-frontend/src/lib/server/phase72/clusterErrors.ts',
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) throw new Error(`Missing: ${file}`);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────────────────────────────

runTests().catch(console.error);
