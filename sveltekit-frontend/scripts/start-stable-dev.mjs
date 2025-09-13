#!/usr/bin/env zx

// Stable Development Setup - Prioritizes stability over advanced features
// Removes QUIC/Caddy complexity temporarily to focus on core functionality

import { $, echo, sleep } from 'zx'

echo`🛠️  Starting Stable Development Environment`
echo`═══════════════════════════════════════════════`
echo`🎯 Focus: Maximum stability for development`
echo`📦 Docker: Infrastructure only`
echo`⚡ Frontend: Direct Vite (no proxy)`
echo``

// Configuration for maximum stability
const config = {
  frontend: {
    port: 5174,
    host: 'localhost', // Use localhost instead of 127.0.0.1 for compatibility
  },
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096', // Increased memory
    DATABASE_URL: 'postgresql://legal_admin:123456@localhost:5433/legal_ai_db',
    REDIS_URL: 'redis://localhost:6379',
    // Disable complex features temporarily for stability
    ENABLE_GPU: 'false',
    VITE_LOG_LEVEL: 'info'
  }
}

// Set environment variables
for (const [key, value] of Object.entries(config.env)) {
  process.env[key] = value
}

// Check Docker
try {
  await $`docker info`
  echo`✅ Docker Desktop is running`
} catch (e) {
  echo`❌ Docker Desktop is not running. Please start Docker Desktop.`
  process.exit(1)
}

// Start Docker infrastructure quietly
echo`🐳 Starting Docker infrastructure services...`
cd('..')
try {
  await $`docker-compose -f docker-compose.legal-ai.yml up -d legal-ai-postgres legal-ai-redis`
  echo`✅ Docker infrastructure started`
} catch (e) {
  echo`⚠️ Docker services may already be running`
}
cd('sveltekit-frontend')

// Wait for services with better error handling
echo`⏳ Waiting for infrastructure services...`

// Wait for PostgreSQL
let pgReady = false
for (let i = 0; i < 20; i++) {
  try {
    await $`docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db`
    echo`✅ PostgreSQL ready on port 5433`
    pgReady = true
    break
  } catch (e) {
    if (i < 19) {
      echo`   Waiting for PostgreSQL... (${i + 1}/20)`
      await sleep(2000)
    }
  }
}

// Wait for Redis
let redisReady = false
for (let i = 0; i < 10; i++) {
  try {
    await $`docker exec legal-ai-redis redis-cli ping`
    echo`✅ Redis ready on port 6379`
    redisReady = true
    break
  } catch (e) {
    if (i < 9) {
      echo`   Waiting for Redis... (${i + 1}/10)`
      await sleep(1000)
    }
  }
}

echo``
echo`🎯 Infrastructure Status:`
echo`   PostgreSQL: ${pgReady ? '✅ Ready' : '❌ Failed'}`
echo`   Redis: ${redisReady ? '✅ Ready' : '❌ Failed'}`
echo``

if (pgReady || redisReady) {
  echo`🚀 Starting SvelteKit development server...`
  echo`   URL: http://${config.frontend.host}:${config.frontend.port}`
  echo`   Config: vite.config.stable.js (optimized for stability)`
  echo``
  echo`💡 Features enabled:`
  echo`   - Enhanced semantic search API`
  echo`   - RAG integration`
  echo`   - Authentication system`
  echo`   - WebSocket HMR (stable configuration)`
  echo``
  echo`💡 Press Ctrl+C to stop frontend (Docker services will keep running)`
  echo``

  try {
    // Use the stable configuration
    await $`vite dev --config vite.config.stable.js --port ${config.frontend.port} --host ${config.frontend.host}`
  } catch (e) {
    echo`❌ Vite startup failed. Trying fallback configuration...`

    // Fallback to basic configuration
    await $`vite dev --port ${config.frontend.port + 1} --host ${config.frontend.host}`
  }
} else {
  echo`❌ Critical services failed to start. Please check Docker configuration.`
  process.exit(1)
}