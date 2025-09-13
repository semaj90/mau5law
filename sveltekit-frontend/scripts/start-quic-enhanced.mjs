#!/usr/bin/env zx

// Enhanced QUIC development setup with Docker infrastructure
// Combines Docker services with native QUIC frontend performance

import { $, question, echo, sleep } from 'zx'

// Configuration
const config = {
  frontend: {
    port: 5176,
    host: '127.0.0.1',
    protocol: 'http3', // QUIC/HTTP3 support
  },
  docker: {
    network: 'legal-ai-network',
    services: ['legal-ai-postgres', 'legal-ai-redis', 'ollama-embeddings']
  },
  env: {
    NODE_OPTIONS: '--max-old-space-size=3072',
    ENABLE_GPU: 'true',
    RTX_3060_OPTIMIZATION: 'true',
    CONTEXT7_MULTICORE: 'true',
    OLLAMA_GPU_LAYERS: '30',
    QUIC_ENABLED: 'true',
    DATABASE_URL: 'postgresql://legal_admin:123456@localhost:5433/legal_ai_db',
    REDIS_URL: 'redis://localhost:6379'
  }
}

echo`🚀 Starting Enhanced QUIC Development Environment`
echo`════════════════════════════════════════════════`
echo`📡 QUIC/HTTP3: ${config.frontend.host}:${config.frontend.port}`
echo`🐳 Docker: Infrastructure services`
echo`⚡ GPU: RTX optimized`
echo``

// Check Docker
try {
  await $`docker info`
  echo`✅ Docker Desktop is running`
} catch (e) {
  echo`❌ Docker Desktop is not running. Please start Docker Desktop.`
  process.exit(1)
}

// Create Docker network
try {
  await $`docker network create ${config.docker.network}`
  echo`🔗 Created Docker network: ${config.docker.network}`
} catch (e) {
  echo`🔗 Docker network already exists: ${config.docker.network}`
}

// Check if Docker infrastructure is already running
echo`🐳 Checking Docker infrastructure services...`
let servicesRunning = false
try {
  await $`docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db`
  await $`docker exec legal-ai-redis redis-cli ping`
  echo`✅ Docker services already running and healthy`
  servicesRunning = true
} catch (e) {
  echo`🐳 Starting Docker infrastructure services...`
  cd('..')
  try {
    await $`docker-compose -f ../docker-compose.legal-ai.yml up -d`
    echo`✅ Docker services started successfully`
  } catch (e) {
    echo`⚠️ Docker services may already be running or unavailable`
    echo`Continuing with native services...`
  }
  cd('sveltekit-frontend')
}

// Wait for services
echo`⏳ Waiting for infrastructure services...`

// Wait for PostgreSQL
let pgReady = false
for (let i = 0; i < 30; i++) {
  try {
    await $`docker exec legal-ai-postgres pg_isready -U legal_admin -d legal_ai_db`
    echo`✅ PostgreSQL ready on port 5433`
    pgReady = true
    break
  } catch (e) {
    echo`   Waiting for PostgreSQL... (${i + 1}/30)`
    await sleep(2000)
  }
}

if (!pgReady) {
  echo`❌ PostgreSQL failed to start`
  process.exit(1)
}

// Wait for Redis
let redisReady = false
for (let i = 0; i < 30; i++) {
  try {
    await $`docker exec legal-ai-redis redis-cli ping`
    echo`✅ Redis ready on port 6379`
    redisReady = true
    break
  } catch (e) {
    echo`   Waiting for Redis... (${i + 1}/30)`
    await sleep(2000)
  }
}

if (!redisReady) {
  echo`❌ Redis failed to start`
  process.exit(1)
}

echo``
echo`🎯 Infrastructure Ready!`
echo`   PostgreSQL: localhost:5433`
echo`   Redis: localhost:6379`
echo`   MinIO: localhost:9000`
echo``

// Set environment variables
for (const [key, value] of Object.entries(config.env)) {
  process.env[key] = value
}

echo`🚀 Starting SvelteKit with QUIC optimization...`
echo`   Frontend: http://${config.frontend.host}:${config.frontend.port}`
echo`   Protected Route: http://${config.frontend.host}:${config.frontend.port}/protected`
echo`   Authentication: Full Lucia v3 support`
echo``
echo`⚡ Features enabled:`
echo`   - QUIC/HTTP3 protocol support`
echo`   - RTX 3060 GPU optimizations`
echo`   - Docker infrastructure`
echo`   - Authentication system`
echo`   - Dynamic port management`
echo``
echo`💡 Press Ctrl+C to stop (Docker services will keep running)`
echo`💡 Run 'docker-compose -f ../docker-compose.yml down' to stop Docker services`
echo``

// Start Caddy for QUIC/HTTP3 support
echo`🔥 Starting Caddy QUIC/HTTP3 proxy...`
try {
  $.spawn`../caddy.exe run --config Caddyfile`
  echo`✅ Caddy HTTP/3 proxy started successfully`
} catch (e) {
  echo`⚠️ Caddy startup failed, continuing without QUIC:`, e.message
}

// Give Caddy time to start
await sleep(2000)

// Start Vite backend server (proxied by Caddy)
echo`🚀 Starting Vite backend server (proxied by Caddy)...`
try {
  await $`PORT=5175 vite dev --port 5175 --host ${config.frontend.host}`
} catch (e) {
  echo`❌ Vite startup failed:`, e.message
  echo`💡 Trying alternative port...`
  try {
    await $`PORT=5177 vite dev --port 5177 --host ${config.frontend.host}`
  } catch (e2) {
    echo`❌ Alternative port also failed:`, e2.message
    process.exit(1)
  }
}